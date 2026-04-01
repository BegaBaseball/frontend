import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHomeLoadState,
  fetchGamesData,
  fetchHomeBootstrap,
  fetchHomeWidgets,
  fetchLeagueStartDates,
  getHomeBootstrapQueryOptions,
  getHomeWidgetsQueryOptions,
  shouldShowHomeConnectionError,
} from './home';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

test('fetchHomeBootstrap은 공개 홈 부트스트랩 요청으로 same-origin fetch를 사용한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;
    return buildJsonResponse({
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
    });
  });

  const response = await fetchHomeBootstrap(new Date('2026-03-16T12:00:00'));

  assert.equal(response.selectedDate, '2026-03-16');
  assert.match(requestUrl, /\/api\/home\/bootstrap\?date=2026-03-16$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.deepEqual(requestInit?.headers, { Accept: 'application/json' });
});

test('fetchHomeWidgets은 공개 위젯 요청으로 seasonYear를 전달한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;
    return buildJsonResponse({
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
    });
  });

  const response = await fetchHomeWidgets(new Date('2026-03-16T12:00:00'), 2025);

  assert.deepEqual(response.hotCheerPosts, []);
  assert.equal(response.featuredMates[0]?.stadium, '잠실야구장');
  assert.equal(response.featuredMates[0]?.section, '1루 내야');
  assert.equal(response.featuredMates[0]?.hostHandle, '@mate-host');
  assert.equal(response.rankingSnapshot.rankingSeasonYear, 2025);
  assert.match(requestUrl, /\/api\/home\/widgets\?date=2026-03-16&seasonYear=2025$/);
  assert.equal(requestInit?.credentials, 'include');
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

test('공개 홈 보조 데이터 요청은 same-origin fetch를 사용한다', async (t) => {
  const observedUrls: string[] = [];
  const observedInit: RequestInit[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    observedUrls.push(url);
    observedInit.push(init ?? {});

    if (url.includes('/kbo/league-start-dates')) {
      return buildJsonResponse({
        regularSeasonStart: '2026-03-22',
        postseasonStart: '2026-10-06',
        koreanSeriesStart: '2026-10-26',
      });
    }

    return buildJsonResponse([]);
  });

  await fetchGamesData(new Date('2026-03-16T12:00:00'));
  await fetchLeagueStartDates();

  assert.deepEqual(observedUrls, [
    '/api/kbo/schedule?date=2026-03-16',
    '/api/kbo/league-start-dates',
  ]);
  observedInit.forEach((init) => {
    assert.equal(init.credentials, 'include');
    assert.deepEqual(init.headers, { Accept: 'application/json' });
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
