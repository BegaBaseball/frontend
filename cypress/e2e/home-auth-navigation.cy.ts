/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

describe('Home navigation auth persistence', () => {
  const user = {
    id: 123,
    email: 'test@example.com',
    name: 'TestUser',
    handle: 'testuser',
    favoriteTeam: 'HH',
    role: 'ROLE_USER',
    hasPassword: true,
    profileImageUrl: null,
  };
  const token = 'home-tab-auth-token';

  beforeEach(() => {
    cy.mockAPI();
    cy.failOnUnexpectedApi401();
    cy.intercept('GET', '**/api/auth/mypage*', {
      statusCode: 200,
      body: {
        success: true,
        data: toAuthApiUser(user),
      },
    }).as('getMeForHomeNavigation');
    cy.intercept('GET', '**/api/diary/entries*', {
      statusCode: 200,
      body: [],
    }).as('getDiaryEntriesForHomeNavigation');
    cy.intercept('GET', '**/api/diary/statistics*', {
      statusCode: 200,
      body: {
        totalCount: 0,
        totalWins: 0,
        totalLosses: 0,
        totalDraws: 0,
        winRate: 0,
        monthlyCount: 0,
        yearlyCount: 0,
        yearlyWins: 0,
        yearlyWinRate: 0,
        mostVisitedStadium: null,
        mostVisitedCount: 0,
        monthlyVisitCounts: {},
        stadiumVisitCounts: {},
        homeVisitCount: 0,
        awayVisitCount: 0,
        scheduledCount: 0,
        happiestMonth: null,
        happiestCount: 0,
        firstDiaryDate: null,
        cheerPostCount: 0,
        mateParticipationCount: 0,
        currentWinStreak: 0,
        longestWinStreak: 0,
        currentLossStreak: 0,
        opponentWinRates: {},
        bestOpponent: '',
        worstOpponent: '',
        dayOfWeekStats: {},
        luckyDay: '',
        earnedBadges: [],
      },
    }).as('getDiaryStatisticsForHomeNavigation');

    cy.visit('/mypage', {
      onBeforeLoad(win) {
        seedCypressAuthState(win, user, token, { skipPublicBootstrap: true });
      },
    });
    cy.contains('TestUser', { timeout: 20000 }).should('be.visible');
  });

  const navigateHomeFromMyPage = () => {
    cy.contains('[data-testid="navbar-capsule"] button', 'BEGA').click();
    cy.location('pathname').should('eq', '/home');
  };

  it('keeps the authenticated UI when the navbar logo returns home from MyPage', () => {
    cy.window().then((win) => {
      (win as Window & { __homeNavReloadSentinel?: boolean }).__homeNavReloadSentinel = true;
    });

    navigateHomeFromMyPage();

    cy.window().its('__homeNavReloadSentinel').should('eq', true);
    cy.contains('TestUser 님', { timeout: 20000 }).should('be.visible');
    cy.contains('button', '로그인').should('not.exist');
    cy.contains('로그인 필요').should('not.exist');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('accessToken')).to.eq(token);
    });
  });

  it('routes the top-right MyPage control to internal mypage, not the public cheer profile', () => {
    cy.intercept('GET', '**/api/users/profile/**').as('getPublicProfile');

    navigateHomeFromMyPage();

    cy.get('[data-testid="navbar-auth-controls"] button[aria-label="TestUser 마이페이지로 이동"]', { timeout: 20000 })
      .should('be.visible')
      .click();

    cy.location('pathname').should('eq', '/mypage');
    cy.get('[data-testid="mypage-season-sidebar"]', { timeout: 20000 }).should('be.visible');
    cy.get('@getPublicProfile.all').should('have.length', 0);
  });
});
