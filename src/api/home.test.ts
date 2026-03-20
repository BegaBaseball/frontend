import test from 'node:test';
import assert from 'node:assert/strict';

import api from './axios';
import {
  buildHomeLoadState,
  fetchGamesData,
  fetchHomeBootstrap,
  fetchHomeWidgets,
  fetchLeagueStartDates,
  fetchRankingsData,
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
        rankingSeasonYear: 2025,
        rankingSourceMessage: '2025 시즌 순위 데이터',
        isOffSeason: true,
        rankings: [],
      },
    } as never;
  });

  const response = await fetchHomeBootstrap(new Date('2026-03-16T12:00:00'));

  assert.equal(response.selectedDate, '2026-03-16');
  assert.equal(requestConfig?.skipAuthSessionHandling, true);
  assert.equal('skipGlobalErrorHandler' in (requestConfig ?? {}), false);
});

test('fetchHomeWidgets은 공개 위젯 요청으로 세션 처리만 건너뛴다', async (t) => {
  let requestConfig: Record<string, unknown> | undefined;

  t.mock.method(api, 'get', async (_path: string, config?: Record<string, unknown>) => {
    requestConfig = config;
    return {
      data: {
        hotCheerPosts: [],
        featuredMates: [],
      },
    } as never;
  });

  const response = await fetchHomeWidgets(new Date('2026-03-16T12:00:00'));

  assert.deepEqual(response.hotCheerPosts, []);
  assert.deepEqual(response.featuredMates, []);
  assert.equal(requestConfig?.skipAuthSessionHandling, true);
  assert.equal('skipGlobalErrorHandler' in (requestConfig ?? {}), false);
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
  await fetchRankingsData(2026);
  await fetchLeagueStartDates();

  assert.equal(observedConfigs.length, 3);
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
    rankings: false,
  }), false);

  assert.equal(shouldShowHomeConnectionError({
    leagueStartDates: false,
    navigation: false,
    games: false,
    scheduledGames: false,
    rankings: false,
  }), true);
});
