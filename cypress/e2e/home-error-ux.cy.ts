/// <reference types="cypress" />

import { getHomeAuthRequestTraces, visitHomePage } from '../support/homePage';

describe('Home error UX', () => {
  const fixedNow = new Date('2026-03-16T12:00:00').getTime();

  const buildBootstrapResponse = (
    date: string,
    prevGameDate: string | null,
    nextGameDate: string | null,
  ) => ({
    selectedDate: date,
    leagueStartDates: {
      regularSeasonStart: '2026-03-22',
      postseasonStart: '2026-10-06',
      koreanSeriesStart: '2026-10-26',
    },
    navigation: {
      hasPrev: Boolean(prevGameDate),
      hasNext: Boolean(nextGameDate),
      prevGameDate,
      nextGameDate,
    },
    games: [],
    scheduledGamesWindow: [],
  });
  const buildWidgetsResponse = (rankingSeasonYear = 2025) => ({
    hotCheerPosts: [],
    featuredMates: [],
    rankingSnapshot: {
      rankingSeasonYear,
      rankingSourceMessage: `${rankingSeasonYear} 시즌 순위 데이터`,
      isOffSeason: rankingSeasonYear < 2026,
      rankings: [],
    },
  });
  const buildManualDataRequiredResponse = (scope: string) => ({
    success: false,
    code: 'MANUAL_BASEBALL_DATA_REQUIRED',
    message: '야구 데이터 준비가 필요합니다. 운영자가 데이터를 제공하면 다시 확인할 수 있습니다.',
    data: {
      scope,
      missingItems: [
        {
          key: 'game_date',
          label: '경기 날짜',
          reason: '요청한 날짜의 홈 일정 row가 없습니다.',
          expected_format: 'YYYY-MM-DD',
        },
      ],
      operatorMessage: '다음 야구 데이터가 필요합니다: 날짜=2026-04-13, 경기 날짜',
      blocking: true,
    },
  });

  beforeEach(() => {
    cy.clock(fixedNow, ['Date']);
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/auth/mypage*', {
      statusCode: 401,
      body: {
        success: false,
        code: 'UNAUTHORIZED',
        message: '인증이 필요합니다.',
        error: 'Unauthorized',
      },
    }).as('getMeAnonymous');
  });

  it('does not request mypage for anonymous home entry', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');

    cy.contains('KBO LEAGUE', { timeout: 15000 }).should('be.visible');
    cy.get('@getMeAnonymous.all').should('have.length', 0);
    cy.get('@getHomeBootstrap.all').should('have.length', 1);
    cy.get('@getHomeWidgets.all').should('have.length', 1);
    getHomeAuthRequestTraces().should('deep.equal', []);
  });

  it('does not request mypage for anonymous root landing entry', () => {
    visitHomePage({
      path: '/',
      authenticated: false,
      resetStorage: true,
    });

    cy.contains('야구를 더 스마트하게', { timeout: 15000 }).should('be.visible');
    cy.get('@getMeAnonymous.all').should('have.length', 0);
    getHomeAuthRequestTraces().should('deep.equal', []);
  });

  it('allows a single deferred mypage attempt on home when auth bootstrap hint is fresh', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
      persistedAuthHint: true,
      authBootstrapMeta: {
        lastSuccessAt: fixedNow - 30_000,
        lastFailureAt: null,
      },
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');

    cy.contains('KBO LEAGUE', { timeout: 15000 }).should('be.visible');
    cy.get('@getMeAnonymous.all').its('length').should('be.gte', 1);
    getHomeAuthRequestTraces().should((traces) => {
      expect(traces).to.have.length(1);
      expect(traces[0]?.url).to.include('/api/auth/mypage');
    });
  });

  it('recovers public auth controls after home refresh when deferred bootstrap succeeds', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    cy.intercept('GET', '**/api/auth/mypage*', {
      delay: 900,
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 123,
          email: 'test@example.com',
          name: 'TestUser',
          handle: 'testuser',
          favoriteTeam: 'HH',
          role: 'ROLE_USER',
          hasPassword: true,
          profileImageUrl: null,
        },
      },
    }).as('getMeRecovered');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
      persistedAuthHint: true,
      authBootstrapMeta: {
        lastSuccessAt: fixedNow - 30_000,
        lastFailureAt: null,
      },
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');
    cy.wait('@getMeRecovered');

    cy.contains('button', '로그인 확인 중...').should('not.exist');
    cy.contains('button', '로그인').should('not.exist');
    cy.contains('button', '로그아웃').should('be.visible');
    getHomeAuthRequestTraces().should((traces) => {
      expect(traces).to.have.length(1);
      expect(traces[0]?.url).to.include('/api/auth/mypage');
    });
  });

  it('returns to the normal login button after home refresh when deferred bootstrap returns 401', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    cy.intercept('GET', '**/api/auth/mypage*', {
      delay: 900,
      statusCode: 401,
      body: {
        success: false,
        code: 'UNAUTHORIZED',
        message: '인증이 필요합니다.',
        error: 'Unauthorized',
      },
    }).as('getMeUnauthorized');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
      persistedAuthHint: true,
      authBootstrapMeta: {
        lastSuccessAt: fixedNow - 30_000,
        lastFailureAt: null,
      },
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');
    cy.wait('@getMeUnauthorized');

    cy.contains('button', '로그인 확인 중...').should('not.exist');
    cy.contains('button', '로그인').should('be.visible');
    getHomeAuthRequestTraces().should((traces) => {
      expect(traces).to.have.length(1);
      expect(traces[0]?.url).to.include('/api/auth/mypage');
    });
  });

  it('returns to the normal login button after home refresh when deferred bootstrap returns 503', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    cy.intercept('GET', '**/api/auth/mypage*', {
      delay: 900,
      statusCode: 503,
      body: {
        success: false,
        code: 'UPSTREAM_TIMEOUT',
        message: 'Unavailable',
      },
    }).as('getMeServerError');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
      persistedAuthHint: true,
      authBootstrapMeta: {
        lastSuccessAt: fixedNow - 30_000,
        lastFailureAt: null,
      },
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');
    cy.wait('@getMeServerError');

    cy.contains('button', '로그인 확인 중...').should('not.exist');
    cy.contains('button', '로그인').should('be.visible');
    getHomeAuthRequestTraces().should((traces) => {
      expect(traces).to.have.length(1);
      expect(traces[0]?.url).to.include('/api/auth/mypage');
    });
  });

  it('renders the normal empty state for a no-game day bootstrap without retrying', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse('2026-04-13', '2026-04-12', '2026-04-14'),
    }).as('getHomeBootstrapNoGameDay');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(2026),
    }).as('getHomeWidgets');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrapNoGameDay');
    cy.wait('@getHomeWidgets');

    cy.contains('경기가 없는 날입니다.', { timeout: 15000 }).should('be.visible');
    cy.get('@getHomeBootstrapNoGameDay.all').should('have.length', 1);
  });

  it('warns instead of erroring when bootstrap returns manual-data-required without retrying', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      delay: 700,
      statusCode: 409,
      body: buildManualDataRequiredResponse('home.schedule'),
    }).as('getHomeBootstrapManualData');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.window().then((win) => {
      cy.spy(win.console, 'error').as('consoleError');
      cy.spy(win.console, 'warn').as('consoleWarn');
    });

    cy.wait('@getHomeBootstrapManualData');
    cy.contains('야구 데이터 준비가 필요합니다. 운영자가 데이터를 제공하면 다시 확인할 수 있습니다.', { timeout: 15000 }).should('be.visible');

    cy.get('@getHomeBootstrapManualData.all').should('have.length', 1);
    cy.get('@consoleError').should('not.have.been.called');
    cy.get('@consoleWarn').should('have.been.calledWithMatch', '[HomeBootstrap] Business conflict while loading bootstrap:');
  });

  it('suppresses deferred mypage retry on home during recent failure cooldown', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
      persistedAuthHint: true,
      authBootstrapMeta: {
        lastSuccessAt: null,
        lastFailureAt: fixedNow - 30_000,
      },
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');

    cy.contains('KBO LEAGUE', { timeout: 15000 }).should('be.visible');
    cy.get('@getMeAnonymous.all').should('have.length', 0);
    getHomeAuthRequestTraces().should('deep.equal', []);
  });

  it('shows connection fallback when bootstrap returns 500 without looping', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 500,
      body: { message: 'forced-bootstrap-failure' },
    }).as('getHomeBootstrapFailure');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    cy.intercept('GET', '**/api/kbo/league-start-dates', {
      statusCode: 200,
      body: {
        regularSeasonStart: '2026-03-22',
        postseasonStart: '2026-10-06',
        koreanSeriesStart: '2026-10-26',
      },
    }).as('getLegacyLeagueDates');

    cy.intercept('GET', '**/api/kbo/schedule/navigation?*', {
      statusCode: 200,
      body: {
        hasPrev: true,
        hasNext: true,
        prevGameDate: '2026-03-15',
        nextGameDate: '2026-03-17',
      },
    }).as('getLegacyNavigation');

    cy.intercept('GET', '**/api/kbo/schedule?*', {
      statusCode: 200,
      body: [],
    }).as('getLegacySchedule');

    cy.intercept('GET', '**/api/kbo/rankings/*', {
      statusCode: 200,
      body: [],
    }).as('legacyRankingsShouldNotRun');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrapFailure');
    cy.wait('@getHomeWidgets');
    cy.contains('서버 연결에 문제가 있습니다.', { timeout: 15000 }).should('be.visible');
    cy.contains('경기 일정을 불러오지 못했습니다', { timeout: 15000 }).should('be.visible');

    cy.wait(300);
    cy.get('@getHomeBootstrapFailure.all').then((requests) => {
      expect(requests.length).to.be.within(1, 2);
    });
    cy.get('@getLegacyLeagueDates.all').should('have.length', 0);
    cy.get('@getLegacyNavigation.all').should('have.length', 0);
    cy.get('@getLegacySchedule.all').should('have.length', 0);
    cy.get('@legacyRankingsShouldNotRun.all').should('have.length', 0);
    cy.contains('KBO LEAGUE').should('be.visible');
  });

  it('shows timeout fallback before delayed bootstrap recovers', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      delay: 4500,
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrapDelayed');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');

    cy.intercept('GET', '**/api/kbo/league-start-dates', {
      statusCode: 200,
      body: {
        regularSeasonStart: '2026-03-22',
        postseasonStart: '2026-10-06',
        koreanSeriesStart: '2026-10-26',
      },
    }).as('getLegacyLeagueDates');

    cy.intercept('GET', '**/api/kbo/schedule/navigation?*', {
      statusCode: 200,
      body: {
        hasPrev: true,
        hasNext: true,
        prevGameDate: '2026-03-15',
        nextGameDate: '2026-03-17',
      },
    }).as('getLegacyNavigation');

    cy.intercept('GET', '**/api/kbo/schedule?*', {
      statusCode: 200,
      body: [],
    }).as('getLegacyScheduleDelayed');

    cy.intercept('GET', '**/api/kbo/rankings/*', {
      statusCode: 200,
      body: [],
    }).as('legacyRankingsShouldNotRun');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeWidgets');
    cy.contains('서버 연결에 문제가 있습니다.', { timeout: 4500 }).should('be.visible');
    cy.contains('경기가 없는 날입니다.').should('be.visible');
    cy.get('@getLegacyLeagueDates.all').should('have.length', 0);
    cy.get('@getLegacyNavigation.all').should('have.length', 0);
    cy.get('@getLegacyScheduleDelayed.all').should('have.length', 0);
    cy.get('@legacyRankingsShouldNotRun.all').should('have.length', 0);
    cy.wait('@getHomeBootstrapDelayed');
    cy.contains('서버 연결에 문제가 있습니다.').should('not.exist');
    cy.get('@getHomeBootstrapDelayed.all').should('have.length', 1);
  });

  it('surfaces widget errors when widgets returns 500 without breaking the page', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 500,
      body: { message: 'forced-widgets-failure' },
    }).as('getHomeWidgetsFailure');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgetsFailure');
    cy.contains('인기 응원글을 불러오지 못했습니다.', { timeout: 15000 }).should('be.visible');
    cy.contains('직관 메이트 목록을 불러오지 못했습니다.').should('be.visible');
    cy.contains('팀 순위를 불러오는 중 문제가 발생했습니다.').should('be.visible');
    cy.contains('button', '다시 시도').should('be.visible');
    cy.get('@getHomeWidgetsFailure.all').then((requests) => {
      expect(requests.length).to.be.within(1, 2);
    });
    cy.contains('KBO LEAGUE').should('be.visible');
  });

  it('requests ranking season changes through home widgets only', () => {
    const widgetSeasonYears: Array<string> = [];

    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', (req) => {
      const seasonYearParam = req.query.seasonYear;
      const seasonYear = Array.isArray(seasonYearParam) ? seasonYearParam[0] : String(seasonYearParam || 'auto');
      widgetSeasonYears.push(seasonYear);

      req.reply({
        statusCode: 200,
        body: buildWidgetsResponse(seasonYear === 'auto' ? 2025 : Number(seasonYear)),
      });
    }).as('getHomeWidgets');

    cy.intercept('GET', '**/api/kbo/rankings/*', {
      statusCode: 200,
      body: [],
    }).as('legacyRankingsShouldNotRun');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');
    cy.contains('2025').should('be.visible');

    cy.get('button[aria-label="2024시즌 팀 순위 보기"]').click({ force: true });
    cy.wait('@getHomeWidgets');

    cy.wrap(null).then(() => {
      expect(widgetSeasonYears).to.deep.equal(['auto', '2024']);
    });
    cy.get('@getHomeBootstrap.all').should('have.length', 1);
    cy.get('@legacyRankingsShouldNotRun.all').should('have.length', 0);
    cy.contains('2024').should('be.visible');
  });

  it('requests bootstrap and widgets once per selected date change', () => {
    const bootstrapDates: string[] = [];
    const widgetDates: string[] = [];

    cy.intercept('GET', '**/api/home/bootstrap*', (req) => {
      const dateParam = req.query.date;
      const date = Array.isArray(dateParam) ? dateParam[0] : String(dateParam || '');
      bootstrapDates.push(date);

      const nextGameDate = date === '2026-03-16' ? '2026-03-17' : '2026-03-18';
      const prevGameDate = date === '2026-03-16' ? '2026-03-15' : '2026-03-16';

      req.reply({
        statusCode: 200,
        body: buildBootstrapResponse(date, prevGameDate, nextGameDate),
      });
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', (req) => {
      const dateParam = req.query.date;
      const date = Array.isArray(dateParam) ? dateParam[0] : String(dateParam || '');
      widgetDates.push(date);

      req.reply({
        statusCode: 200,
        body: buildWidgetsResponse(),
      });
    }).as('getHomeWidgets');

    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');

    cy.get('[data-testid="home-date-next"]').click({ force: true });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');

    cy.contains(/2026\.3\.17/, { timeout: 15000 }).should('be.visible');

    cy.wrap(null).then(() => {
      expect(bootstrapDates).to.deep.equal(['2026-03-16', '2026-03-17']);
      expect(widgetDates).to.deep.equal(['2026-03-16', '2026-03-17']);
    });

    cy.get('@getHomeBootstrap.all').should('have.length', 2);
    cy.get('@getHomeWidgets.all').should('have.length', 2);
  });
});
