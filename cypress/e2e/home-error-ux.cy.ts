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

  it('falls back to legacy widget data when widgets returns 500 without breaking the page', () => {
    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: buildBootstrapResponse('2026-03-16', '2026-03-15', '2026-03-17'),
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 500,
      body: { message: 'forced-widgets-failure' },
    }).as('getHomeWidgetsFailure');

    cy.intercept('GET', '**/api/cheer/posts/hot*', {
      statusCode: 200,
      body: {
        content: [
          {
            id: 91,
            teamId: 'LG',
            author: '테스트 작성자',
            authorHandle: '@fallback',
            content: '홈 fallback 인기글',
            createdAt: '2026-03-16T04:30:00Z',
            comments: 2,
            likes: 3,
            bookmarkCount: 0,
            views: 12,
            isHot: true,
            isBookmarked: false,
            isOwner: false,
            repostCount: 0,
            repostedByMe: false,
            postType: 'NORMAL',
            imageUrls: [],
          },
        ],
        last: true,
        totalPages: 1,
        totalElements: 1,
        size: 5,
        number: 0,
      },
    }).as('getLegacyHotPosts');

    cy.intercept('GET', '**/api/parties?page=0&size=1000*', {
      statusCode: 200,
      body: [
        {
          id: 301,
          hostId: 701,
          hostName: '메이트 호스트',
          hostBadge: 'NEW',
          hostAverageRating: 4.5,
          hostReviewCount: 3,
          teamId: 'LG',
          gameDate: '2026-03-20',
          gameTime: '18:30',
          stadium: '잠실야구장',
          homeTeam: 'LG',
          awayTeam: 'LT',
          section: '1루석',
          maxParticipants: 4,
          currentParticipants: 1,
          description: '홈 fallback 메이트',
          ticketVerified: false,
          status: 'PENDING',
          ticketPrice: 22000,
          createdAt: '2026-03-16T04:30:00Z',
        },
      ],
    }).as('getLegacyFeaturedMates');

    cy.visit('/home', {
      onBeforeLoad: seedAnonymousHomeState,
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgetsFailure');
    cy.wait('@getLegacyHotPosts');
    cy.wait('@getLegacyFeaturedMates');

    cy.contains('홈 fallback 인기글', { timeout: 15000 }).should('be.visible');
    cy.contains('LG 트윈스 vs 롯데 자이언츠').should('be.visible');
    cy.get('@getHomeWidgetsFailure.all').should('have.length', 1);
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
