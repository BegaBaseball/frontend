/// <reference types="cypress" />

describe('Home error UX', () => {
  const fixedNow = new Date('2026-03-16T12:00:00').getTime();

  const seedAnonymousHomeState = (win: Window) => {
    win.localStorage.setItem('auth-storage', JSON.stringify({
      state: {},
      version: 0,
    }));
    win.localStorage.removeItem('auth-bootstrap-hint');
    win.localStorage.setItem('bega_has_visited', 'true');
    win.localStorage.setItem('bega_dont_show_guide', 'true');
  };

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
    rankingSeasonYear: 2025,
    rankingSourceMessage: '2025 시즌 순위 데이터',
    isOffSeason: true,
    rankings: [],
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
      body: {
        hotCheerPosts: [],
        featuredMates: [],
      },
    }).as('getHomeWidgets');

    cy.visit('/home', {
      onBeforeLoad: seedAnonymousHomeState,
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');

    cy.contains('KBO LEAGUE', { timeout: 15000 }).should('be.visible');
    cy.get('@getMeAnonymous.all').should('have.length', 0);
    cy.get('@getHomeBootstrap.all').should('have.length', 1);
    cy.get('@getHomeWidgets.all').should('have.length', 1);
  });

  it('does not request mypage for anonymous root landing entry', () => {
    cy.visit('/', {
      onBeforeLoad: seedAnonymousHomeState,
    });

    cy.contains('야구를 더 스마트하게', { timeout: 15000 }).should('be.visible');
    cy.get('@getMeAnonymous.all').should('have.length', 0);
  });

  it('falls back to legacy home data when bootstrap returns 500 without looping', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 500,
      body: { message: 'forced-bootstrap-failure' },
    }).as('getHomeBootstrapFailure');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: {
        hotCheerPosts: [],
        featuredMates: [],
      },
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
    }).as('getLegacyRankings');

    cy.visit('/home', {
      onBeforeLoad: seedAnonymousHomeState,
    });

    cy.wait('@getHomeBootstrapFailure');
    cy.wait('@getLegacyLeagueDates');
    cy.wait('@getLegacyNavigation');
    cy.contains('경기가 없는 날입니다.', { timeout: 15000 }).should('be.visible');

    cy.wait(300);
    cy.get('@getHomeBootstrapFailure.all').should('have.length', 1);
    cy.contains('KBO LEAGUE').should('be.visible');
  });

  it('starts legacy fallback when bootstrap is delayed past the threshold', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      delay: 4500,
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrapDelayed');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: {
        hotCheerPosts: [],
        featuredMates: [],
      },
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
    }).as('getLegacyRankings');

    cy.visit('/home', {
      onBeforeLoad: seedAnonymousHomeState,
    });

    cy.wait('@getLegacyLeagueDates');
    cy.wait('@getLegacyNavigation');
    cy.wait('@getLegacyRankings');
    cy.contains('경기가 없는 날입니다.', { timeout: 15000 }).should('be.visible');
    cy.contains('서버 연결에 문제가 있습니다.').should('not.exist');
    cy.wait('@getHomeBootstrapDelayed');
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

    cy.visit('/home', {
      onBeforeLoad: seedAnonymousHomeState,
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgetsFailure');
    cy.contains('인기 응원글을 불러오지 못했습니다.', { timeout: 15000 }).should('be.visible');
    cy.contains('직관 메이트 목록을 불러오지 못했습니다.').should('be.visible');
    cy.contains('button', '다시 시도').should('be.visible');
    cy.get('@getHomeWidgetsFailure.all').then((requests) => {
      expect(requests.length).to.be.within(1, 2);
    });
    cy.contains('KBO LEAGUE').should('be.visible');
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
        body: {
          hotCheerPosts: [],
          featuredMates: [],
        },
      });
    }).as('getHomeWidgets');

    cy.visit('/home', {
      onBeforeLoad: seedAnonymousHomeState,
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
