import test from 'node:test';
import assert from 'node:assert/strict';

import api from './axios';
import {
  buildHomeLoadState,
  fetchGamesData,
  fetchHomeBootstrap,
  fetchHomeRankingSnapshot,
  fetchHomeWidgets,
  fetchLeagueStartDates,
  getHomeBootstrapQueryOptions,
  getHomeRankingSnapshotQueryOptions,
  getHomeWidgetsQueryOptions,
  shouldShowHomeConnectionError,
} from './home';

test('fetchHomeBootstrap은 공개 홈 부트스트랩 요청으로 세션 처리만 건너뛴다', async (t) => {
  let requestConfig: Record<string, unknown> | undefined;

  t.mock.method(api, 'get', async (_path: string, config?: Record<string, unknown>) => {
    requestConfig = config;
    return {
      data: {
        selectedDate: '2026-03-16',
        leagueStartDates: {
          regularSeasonStart: '2026-03-22',
          postseasonStart: '2026-10-06',
          koreanSeriesStart: '2026-10-26',
        },
        navigation: {
          hasPrev: true,
          hasNext: true,
          prevGameDate: '2026-03-15',
          nextGameDate: '2026-03-17',
        },
        games: [],
        scheduledGamesWindow: [],
      },
    } as never;
  });

  const response = await fetchHomeBootstrap(new Date('2026-03-16T12:00:00'));

  assert.equal(response.selectedDate, '2026-03-16');
  assert.equal(requestConfig?.skipAuthSessionHandling, true);
  assert.equal('skipGlobalErrorHandler' in (requestConfig ?? {}), false);
});

test('fetchHomeWidgets은 공개 위젯 요청으로 세션 처리만 건너뛰고 seasonYear를 전달한다', async (t) => {
  let requestConfig: Record<string, unknown> | undefined;

  t.mock.method(api, 'get', async (_path: string, config?: Record<string, unknown>) => {
    requestConfig = config;
    return {
      data: {
        hotCheerPosts: [],
        featuredMates: [{
          id: 12,
          hostId: 5,
          hostHandle: '@mate-host',
          teamId: 'LG',
          stadium: '잠실야구장',
          gameDate: '2026-03-16',
          gameTime: '18:30',
          section: '1루 내야',
          currentParticipants: 1,
          maxParticipants: 4,
          status: 'PENDING',
          description: '같이 응원해요',
          homeTeam: 'LG',
          awayTeam: 'SS',
          ticketPrice: 15000,
        }],
        rankingSnapshot: {
          rankingSeasonYear: 2025,
          rankingSourceMessage: '2025 시즌 순위 데이터',
          isOffSeason: true,
          rankings: [],
        },
      },
    } as never;
  });

  const response = await fetchHomeWidgets(new Date('2026-03-16T12:00:00'), 2025);

  assert.deepEqual(response.hotCheerPosts, []);
  assert.equal(response.featuredMates[0]?.stadium, '잠실야구장');
  assert.equal(response.featuredMates[0]?.section, '1루 내야');
  assert.equal(response.featuredMates[0]?.hostHandle, '@mate-host');
  assert.equal(response.rankingSnapshot.rankingSeasonYear, 2025);
  assert.equal(requestConfig?.skipAuthSessionHandling, true);
  assert.deepEqual(requestConfig?.params, { date: '2026-03-16', seasonYear: 2025 });
  assert.equal('skipGlobalErrorHandler' in (requestConfig ?? {}), false);
});

test('fetchHomeRankingSnapshot은 순위 스냅샷 전용 엔드포인트를 사용한다', async (t) => {
  let requestPath = '';
  let requestConfig: Record<string, unknown> | undefined;

  t.mock.method(api, 'get', async (path: string, config?: Record<string, unknown>) => {
    requestPath = path;
    requestConfig = config;
    return {
      data: {
        rankingSeasonYear: 2025,
        rankingSourceMessage: '2025 시즌 순위 데이터',
        isOffSeason: false,
        rankings: [],
      },
    } as never;
  });

  const response = await fetchHomeRankingSnapshot(new Date('2026-03-16T12:00:00'), 2025);

  assert.equal(requestPath, '/kbo/rankings/snapshot');
  assert.equal(response.rankingSeasonYear, 2025);
  assert.equal(requestConfig?.skipAuthSessionHandling, true);
  assert.deepEqual(requestConfig?.params, { date: '2026-03-16', seasonYear: 2025 });
});

test('getHomeWidgetsQueryOptions는 auto와 explicit seasonYear를 서로 다른 캐시 키로 분리한다', () => {
  const date = new Date('2026-03-16T12:00:00');

  assert.deepEqual(getHomeWidgetsQueryOptions(date).queryKey, ['home', 'widgets', '2026-03-16', 'auto']);
  assert.deepEqual(getHomeWidgetsQueryOptions(date, 2025).queryKey, ['home', 'widgets', '2026-03-16', 2025]);
});

test('getHomeBootstrapQueryOptions는 날짜별 bootstrap 캐시 키를 사용한다', () => {
  const date = new Date('2026-03-16T12:00:00');

  assert.deepEqual(
    getHomeBootstrapQueryOptions(date).queryKey,
    ['home', 'bootstrap', '2026-03-16'],
  );
});

test('getHomeRankingSnapshotQueryOptions는 date+seasonYear 기준으로 ranking snapshot 캐시 키를 공유한다', () => {
  const date = new Date('2026-03-16T12:00:00');

  assert.deepEqual(
    getHomeRankingSnapshotQueryOptions(date, 2025).queryKey,
    ['ranking-snapshot', '2026-03-16', 2025],
  );
});

test('공개 홈 보조 데이터 요청도 세션 처리만 건너뛴다', async (t) => {
  const observedConfigs: Array<Record<string, unknown> | undefined> = [];

  t.mock.method(api, 'get', async (path: string, config?: Record<string, unknown>) => {
    observedConfigs.push(config);

    if (path === '/kbo/league-start-dates') {
      return {
        data: {
          regularSeasonStart: '2026-03-22',
          postseasonStart: '2026-10-06',
          koreanSeriesStart: '2026-10-26',
        },
      } as never;
    }

    return {
      data: [],
    } as never;
  });

  await fetchGamesData(new Date('2026-03-16T12:00:00'));
  await fetchLeagueStartDates();

  assert.equal(observedConfigs.length, 2);
  observedConfigs.forEach((config) => {
    assert.equal(config?.skipAuthSessionHandling, true);
    assert.equal('skipGlobalErrorHandler' in (config ?? {}), false);
  });
});

test('buildHomeLoadState는 레거시 폴백 timeout 상태를 구조화한다', () => {
  const state = buildHomeLoadState('legacy-fallback', { timedOut: true });

  assert.deepEqual(state, {
    source: 'legacy-fallback',
    isFallback: true,
    timedOut: true,
  });
});

test('shouldShowHomeConnectionError는 모든 핵심 섹션이 실패한 경우에만 true를 반환한다', () => {
  assert.equal(shouldShowHomeConnectionError({
    leagueStartDates: false,
    navigation: true,
    games: false,
    scheduledGames: false,
  }), false);

  assert.equal(shouldShowHomeConnectionError({
    leagueStartDates: false,
    navigation: false,
    games: false,
    scheduledGames: false,
  }), true);
});
