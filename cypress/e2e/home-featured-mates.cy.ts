/// <reference types="cypress" />

import { getHomeAuthRequestTraces, visitHomePage } from '../support/homePage';

describe('Home featured mates navigation', () => {
  const selectedDate = '2026-03-16';
  const featuredMate = {
    id: 911,
    hostId: 41,
    hostHandle: '@featured-host',
    teamId: 'WO',
    stadium: '고척스카이돔',
    gameDate: '2026-03-17',
    gameTime: '18:30',
    section: '1루 내야',
    currentParticipants: 2,
    maxParticipants: 4,
    status: 'PENDING',
    description: '같이 직관 가요',
    homeTeam: 'WO',
    awayTeam: 'LG',
    ticketPrice: 22000,
  } as const;

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    (cy as any).mockAPI();

    cy.intercept('GET', '**/api/home/bootstrap*', {
      statusCode: 200,
      body: {
        selectedDate,
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
    }).as('getHomeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: {
        hotCheerPosts: [],
        featuredMates: [featuredMate],
        rankingSnapshot: {
          rankingSeasonYear: 2025,
          rankingSourceMessage: '2025 시즌 순위 데이터',
          isOffSeason: false,
          rankings: [],
        },
      },
    }).as('getHomeWidgets');

    cy.intercept('GET', `**/api/parties/${featuredMate.id}*`, {
      statusCode: 200,
      delay: 1200,
      body: featuredMate,
    }).as('getFeaturedMateDetail');

    cy.intercept('GET', `**/api/applications/party/${featuredMate.id}/mine`, {
      statusCode: 404,
      body: {},
    }).as('getFeaturedMateMyApplication');
  });

  it('keeps mate preview visible while home-to-detail background refresh is running', () => {
    visitHomePage({
      path: '/home',
      token: 'home-featured-mates-token',
      user: { favoriteTeam: 'LG' },
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrap');
    cy.wait('@getHomeWidgets');
    cy.get('@getMe.all').should('have.length', 0);
    getHomeAuthRequestTraces().should('deep.equal', []);

    cy.contains('TestUser 님', { timeout: 10000 }).should('be.visible');
    cy.contains('button', '키움').click();

    cy.location('pathname').should('eq', `/mate/${featuredMate.id}`);
    cy.contains('고척스카이돔').should('be.visible');
    cy.contains('파티 정보를 불러오는 중').should('not.exist');
  });
});
