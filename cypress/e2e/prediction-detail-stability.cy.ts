/// <reference types="cypress" />

describe('Prediction detail stability', () => {
  const fakeToken = 'prediction-detail-stability-token';
  const targetDate = '2026-02-04';
  const targetGameId = '20240510LGLK0';

  const seedAuthState = (win: Window) => {
    win.localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: {
          id: 123,
          email: 'test@example.com',
          name: 'TestUser',
          handle: 'testuser',
          favoriteTeam: 'LG',
          role: 'ROLE_USER',
          hasPassword: true,
          profileImageUrl: null,
        },
        isLoggedIn: true,
        isAdmin: false,
      },
      version: 0,
    }));
    win.localStorage.setItem('accessToken', fakeToken);
    win.localStorage.setItem('bega_has_visited', 'true');
    win.localStorage.setItem('bega_dont_show_guide', 'true');
  };

  beforeEach(() => {
    (cy as any).login('user');
    (cy as any).mockAPI();

    cy.intercept('GET', '**/api/auth/mypage*', {
      statusCode: 200,
      body: {
        id: 123,
        email: 'test@example.com',
        name: 'TestUser',
        handle: 'testuser',
        favoriteTeam: 'LG',
        role: 'ROLE_USER',
        profileImageUrl: null,
        hasPassword: true,
      },
    }).as('getMe');

    cy.intercept('GET', '**/api/matches/day*', {
      statusCode: 200,
      body: {
        date: targetDate,
        games: [
          {
            gameId: targetGameId,
            gameDate: targetDate,
            time: '18:30',
            stadium: '잠실',
            gameStatus: 'SCHEDULED',
            homeTeam: 'LG',
            awayTeam: 'KT',
          },
        ],
        prevDate: null,
        nextDate: null,
        hasPrev: false,
        hasNext: false,
      },
    }).as('getScheduleDay');

    cy.intercept('GET', `**/api/matches/${targetGameId}*`, {
      statusCode: 500,
      body: {
        message: 'detail fetch failed',
      },
    }).as('getGameDetailFailure');

    cy.intercept('**/api/predictions/my-votes*', {
      statusCode: 200,
      body: {
        votes: {
          [targetGameId]: null,
        },
      },
    }).as('getUserVotes');

    cy.intercept('GET', '**/api/predictions/my-vote/*', {
      statusCode: 410,
      body: { message: 'legacy endpoint removed' },
    }).as('getUserVote');

    cy.intercept('**/api/predictions/status/*', {
      statusCode: 200,
      body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
    }).as('getVoteStatus');

    cy.intercept('**/api/kbo/rankings/*', {
      statusCode: 200,
      body: [],
    }).as('getRankings');
  });

  it('keeps the current match card visible and shows the inline error banner when detail fetch fails', () => {
    cy.visit(`/prediction?gameId=${targetGameId}&date=${targetDate}`, {
      onBeforeLoad: seedAuthState,
    });
    cy.window().then((win) => {
      seedAuthState(win);
    });
    cy.setCookie('Authorization', fakeToken);

    cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    cy.wait('@getMe');
    cy.wait('@getScheduleDay');
    cy.wait('@getGameDetailFailure');
    cy.wait('@getVoteStatus');
    cy.wait('@getRankings');

    cy.contains(/LG(\s*트윈스)?/).should('be.visible');
    cy.contains(/KT(\s*위즈)?/).should('be.visible');
    cy.get('[data-testid="prediction-detail-error-banner"]').should('be.visible');
    cy.contains('예측으로 돌아가기').should('be.visible');
  });
});
