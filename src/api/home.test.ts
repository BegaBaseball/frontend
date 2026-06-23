import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHomeLoadState,
  fetchGamesData,
  fetchGamesRangeData,
  fetchHomeBootstrap,
  fetchHomeScopedNavigation,
  fetchHomeWidgets,
  fetchLeagueStartDates,
  HOME_BOOTSTRAP_REQUEST_TIMEOUT_MS,
  getHomeBootstrapQueryOptions,
  getHomeWidgetsQueryOptions,
  isHomeBootstrapBusinessConflict,
  shouldRetryHomeBootstrapQuery,
  shouldShowHomeConnectionError,
} from './home';
import { PublicApiError } from './publicClient';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

test('fetchHomeBootstrap은 공개 홈 부트스트랩 요청으로 same-origin fetch를 사용한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const observedTimeouts: number[] = [];
  const originalSetTimeout = globalThis.setTimeout;

  t.mock.method(globalThis, 'setTimeout', ((handler: Parameters<typeof globalThis.setTimeout>[0], timeout?: number) => {
    if (typeof timeout === 'number') {
      observedTimeouts.push(timeout);
    }
    return originalSetTimeout(handler, timeout);
  }) as typeof globalThis.setTimeout);

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
      rankingSnapshot: {
        rankingSeasonYear: 2025,
        rankingSourceMessage: 'out-of-contract bootstrap field',
        isOffSeason: true,
        rankings: [],
      },
      loadState: {
        isFallback: false,
        timedOut: false,
        timedOutSections: [],
        failedSections: [],
      },
    });
  });

  const response = await fetchHomeBootstrap(new Date('2026-03-16T12:00:00'));

  assert.equal(response.selectedDate, '2026-03-16');
  assert.deepEqual(response.loadState?.failedSections, []);
  assert.equal(Object.prototype.hasOwnProperty.call(response, 'rankingSnapshot'), false);
  assert.match(requestUrl, /\/api\/home\/bootstrap\?date=2026-03-16$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.deepEqual(requestInit?.headers, { Accept: 'application/json' });
  assert.ok(observedTimeouts.includes(HOME_BOOTSTRAP_REQUEST_TIMEOUT_MS));
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

test('fetchHomeWidgets는 rankingSnapshot 누락 응답을 거부한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildJsonResponse({
    hotCheerPosts: [],
    featuredMates: [],
  }));

  await assert.rejects(
    () => fetchHomeWidgets(new Date('2026-03-16T12:00:00')),
    /Invalid home widgets response/,
  );
});

test('fetchHomeScopedNavigation은 scoped navigation 요청으로 same-origin fetch를 사용한다', async (t) => {
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
      resolvedDate: '2026-04-28',
      prevGameDate: '2026-04-26',
      nextGameDate: '2026-04-28',
      hasPrev: true,
      hasNext: true,
    });
  });

  const response = await fetchHomeScopedNavigation(new Date('2026-04-27T12:00:00'), 'regular', 2026);

  assert.equal(response.resolvedDate, '2026-04-28');
  assert.match(requestUrl, /\/api\/home\/navigation\?date=2026-04-27&scope=regular&seasonYear=2026$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.deepEqual(requestInit?.headers, { Accept: 'application/json' });
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

test('home bootstrap query는 비즈니스 409를 재시도하지 않는다', () => {
  const manualDataConflict = new PublicApiError(409, 'conflict', {
    code: 'MANUAL_BASEBALL_DATA_REQUIRED',
  });
  const upstreamFailure = new PublicApiError(500, 'boom');

  assert.equal(isHomeBootstrapBusinessConflict(manualDataConflict), true);
  assert.equal(isHomeBootstrapBusinessConflict(upstreamFailure), false);
  assert.equal(shouldRetryHomeBootstrapQuery(0, manualDataConflict), false);
  assert.equal(shouldRetryHomeBootstrapQuery(0, upstreamFailure), true);
  assert.equal(shouldRetryHomeBootstrapQuery(1, upstreamFailure), false);
  assert.equal(
    getHomeBootstrapQueryOptions(new Date('2026-03-16T12:00:00')).retry(0, manualDataConflict),
    false,
  );
});

test('fetchGamesData는 kbo schedule wire 응답을 home Game으로 정규화한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    return buildJsonResponse([{
      gameId: '20260402LTHH',
      time: '18:30',
      stadium: '대전',
      gameStatus: 'SCHEDULED',
      gameStatusKr: '예정',
      gameInfo: '롯데 vs 한화',
      leagueType: 'REGULAR',
      homeTeam: 'HH',
      homeTeamFull: '한화 이글스',
      awayTeam: 'LT',
      awayTeamFull: '롯데 자이언츠',
      gameDate: '2026-04-02',
    }]);
  });

  const response = await fetchGamesData(new Date('2026-04-02T12:00:00'));

  assert.equal(response[0]?.gameId, '20260402LTHH');
  assert.equal(response[0]?.time, '18:30');
  assert.equal(response[0]?.gameInfo, '롯데 vs 한화');
  assert.equal(response[0]?.homeTeamFull, '한화 이글스');
  assert.match(requestUrl, /\/api\/kbo\/schedule\?date=2026-04-02$/);
});

test('fetchGamesRangeData는 경기 월 범위를 matches/range 단일 요청으로 조회한다', async (t) => {
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
      content: [{
        gameId: '20260402LTHH',
        gameDate: '2026-04-02',
        startTime: { hour: 18, minute: 30 },
        stadium: '대전',
        gameStatus: 'SCHEDULED',
        leagueType: 'REGULAR',
        homeTeam: 'HH',
        awayTeam: 'LT',
        homeScore: 0,
        awayScore: 0,
      }],
      page: 0,
      size: 500,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
  });

  const response = await fetchGamesRangeData('2026-04-01', '2026-04-30');

  assert.equal(response[0]?.gameId, '20260402LTHH');
  assert.equal(response[0]?.time, '18:30');
  assert.equal(response[0]?.gameStatusKr, '예정');
  assert.equal(response[0]?.homeTeamFull, '한화 이글스');
  assert.equal(response[0]?.awayTeamFull, '롯데 자이언츠');
  assert.equal(response[0]?.gameInfo, '롯데 자이언츠 vs 한화 이글스');
  assert.match(requestUrl, /\/api\/matches\/range\?/);
  assert.ok(requestUrl.includes('startDate=2026-04-01'));
  assert.ok(requestUrl.includes('endDate=2026-04-30'));
  assert.ok(requestUrl.includes('page=0'));
  assert.ok(requestUrl.includes('size=500'));
  assert.ok(requestUrl.includes('includePast=true'));
  assert.ok(requestUrl.includes('withMeta=true'));
  assert.equal(requestInit?.credentials, 'include');
  assert.deepEqual(requestInit?.headers, { Accept: 'application/json' });
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
    timedOutSections: [],
    failedSections: [],
    failureReason: null,
    manualDataRequest: null,
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
