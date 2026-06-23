/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

describe('Home calendar date picker', () => {
  const fixedNow = new Date('2026-06-06T12:00:00').getTime();

  const buildBootstrapResponse = (date: string) => ({
    selectedDate: date,
    leagueStartDates: {
      regularSeasonStart: '2026-03-22',
      postseasonStart: '2026-10-06',
      koreanSeriesStart: '2026-10-26',
    },
    navigation: {
      hasPrev: true,
      hasNext: true,
      prevGameDate: '2026-06-05',
      nextGameDate: '2026-06-07',
    },
    games: [],
    scheduledGamesWindow: [],
  });

  const buildWidgetsResponse = () => ({
    hotCheerPosts: [],
    featuredMates: [],
    rankingSnapshot: {
      rankingSeasonYear: 2026,
      rankingSourceMessage: '2026 시즌 순위 데이터',
      isOffSeason: false,
      rankings: [],
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

    cy.intercept('GET', '**/api/home/bootstrap*', (req) => {
      const dateParam = req.query.date;
      const date = Array.isArray(dateParam) ? dateParam[0] : String(dateParam || '2026-06-06');

      req.reply({
        statusCode: 200,
        body: buildBootstrapResponse(date),
      });
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: buildWidgetsResponse(),
    }).as('getHomeWidgets');
  });

  const visitCalendarHome = () => {
    visitHomePage({
      path: '/home?date=2026-06-06',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrap');
    cy.contains('KBO LEAGUE', { timeout: 15000 }).should('be.visible');
  };

  const openDatePicker = () => {
    cy.contains('button', '날짜 변경').click();
    cy.contains('[role="dialog"]', '날짜 선택', { timeout: 10000 }).should('be.visible');
  };

  it('keeps calendar month browsing local until a date is selected', () => {
    visitCalendarHome();
    openDatePicker();

    cy.get('@getHomeBootstrap.all').should('have.length', 1);
    cy.location('search').then((searchBeforeNavigation) => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains('2026년 6월').should('be.visible');
        cy.get('button[aria-label="다음 달"]').click();
        cy.contains('2026년 7월').should('be.visible');
        cy.get('button[aria-label="이전 달"]').click();
        cy.contains('2026년 6월').should('be.visible');
        cy.get('button[aria-label="다음 달"]').click();
        cy.contains('2026년 7월').should('be.visible');
      });

      cy.location('search').should('eq', searchBeforeNavigation);
      cy.get('@getHomeBootstrap.all').should('have.length', 1);

      cy.get('[role="dialog"]').within(() => {
        cy.contains('button', /^15$/).click();
      });
    });

    cy.get('[role="dialog"]').should('not.exist');
    cy.location('search').should('include', 'date=2026-07-15');
    cy.location('search').should('include', 'tab=regular');
    cy.wait('@getHomeBootstrap');
    cy.get('@getHomeBootstrap.all').should('have.length', 2);
    cy.get('@getMeAnonymous.all').should('have.length', 0);
  });

  it('does not reset the open picker month when the selected date changes externally', () => {
    visitCalendarHome();
    openDatePicker();

    cy.get('[role="dialog"]').within(() => {
      cy.contains('2026년 6월').should('be.visible');
      cy.get('button[aria-label="다음 달"]').click();
      cy.contains('2026년 7월').should('be.visible');
    });

    cy.window().then((win) => {
      win.history.pushState({}, '', '/home?date=2026-08-01&tab=regular');
      win.dispatchEvent(new win.PopStateEvent('popstate', { state: {} }));
    });

    cy.wait('@getHomeBootstrap');
    cy.location('search').should('include', 'date=2026-08-01');

    cy.get('[role="dialog"]').within(() => {
      cy.contains('2026년 7월').should('be.visible');
      cy.contains('button', /^15$/).click();
    });

    cy.get('[role="dialog"]').should('not.exist');
    cy.location('search').should('include', 'date=2026-07-15');
    cy.location('search').should('include', 'tab=regular');
    cy.wait('@getHomeBootstrap');
    cy.get('@getHomeBootstrap.all').should('have.length', 3);
    cy.get('@getMeAnonymous.all').should('have.length', 0);
  });
});
