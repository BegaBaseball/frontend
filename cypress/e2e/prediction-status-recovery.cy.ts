/// <reference types="cypress" />

import {
  installPredictionAuthenticatedSessionIntercept,
  visitPredictionPage,
} from '../support/predictionPage';

describe('Prediction status recovery', () => {
  const targetGameId = '20260201KIASK0';
  const targetDate = '2026-02-01';
  const authToken = 'prediction-status-recovery-token';

  const inningScores = [
    { inning: 1, teamCode: 'KIA', teamSide: 'away', runs: 0 },
    { inning: 1, teamCode: 'SSG', teamSide: 'home', runs: 0 },
    { inning: 2, teamCode: 'KIA', teamSide: 'away', runs: 0 },
    { inning: 2, teamCode: 'SSG', teamSide: 'home', runs: 4 },
    { inning: 3, teamCode: 'KIA', teamSide: 'away', runs: 0 },
    { inning: 3, teamCode: 'SSG', teamSide: 'home', runs: 5 },
    { inning: 4, teamCode: 'KIA', teamSide: 'away', runs: 2 },
    { inning: 4, teamCode: 'SSG', teamSide: 'home', runs: 1 },
    { inning: 5, teamCode: 'KIA', teamSide: 'away', runs: 0 },
    { inning: 5, teamCode: 'SSG', teamSide: 'home', runs: 0 },
    { inning: 6, teamCode: 'KIA', teamSide: 'away', runs: 0 },
    { inning: 6, teamCode: 'SSG', teamSide: 'home', runs: 0 },
    { inning: 7, teamCode: 'KIA', teamSide: 'away', runs: 4 },
    { inning: 7, teamCode: 'SSG', teamSide: 'home', runs: 0 },
    { inning: 8, teamCode: 'KIA', teamSide: 'away', runs: 0 },
    { inning: 8, teamCode: 'SSG', teamSide: 'home', runs: 1 },
    { inning: 9, teamCode: 'KIA', teamSide: 'away', runs: 0 },
    { inning: 9, teamCode: 'SSG', teamSide: 'home', runs: 0 },
  ];

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    (cy as any).mockAPI({ skipRankings: true });
    installPredictionAuthenticatedSessionIntercept();

    cy.intercept('GET', '**/api/matches/day*', {
      statusCode: 200,
      body: {
        date: targetDate,
        games: [
          {
            gameId: targetGameId,
            gameDate: targetDate,
            homeTeam: 'SSG',
            awayTeam: 'KIA',
            stadium: '문학',
            homeScore: null,
            awayScore: null,
            winner: null,
          },
        ],
        prevDate: null,
        nextDate: null,
        hasPrev: false,
        hasNext: false,
      },
    }).as('getScheduleDay');

    cy.intercept('GET', `**/api/matches/${targetGameId}*`, {
      statusCode: 200,
      body: {
        gameId: targetGameId,
        gameDate: targetDate,
        homeTeam: 'SSG',
        awayTeam: 'KIA',
        stadium: '문학',
        startTime: '14:00:00',
        gameStatus: 'SCHEDULED',
        gameStatusKr: '경기 시작 예정',
        homeScore: null,
        awayScore: null,
        inningScores,
        summary: [],
      },
    }).as('getGameDetail');

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

    cy.intercept('**/api/kbo/rankings/snapshot*', {
      statusCode: 200,
      body: [],
    }).as('getRankings');

    cy.intercept('**/api/kbo/league-start-dates*', {
      statusCode: 200,
      body: {
        regularSeasonStart: '2025-03-22',
        postseasonStart: '2025-10-06',
        koreanSeriesStart: '2025-10-26',
      },
    }).as('getLeagueDates');
  });

  it('shows the actual result instead of the scheduled banner when inning data exists', () => {
    visitPredictionPage({
      path: `/prediction?gameId=${targetGameId}&date=${targetDate}`,
      token: authToken,
      authenticated: true,
      resetStorage: true,
    });

    cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    cy.wait('@getScheduleDay');
    cy.wait('@getGameDetail');
    cy.wait('@getUserVotes');
    cy.wait('@getVoteStatus');
    cy.wait('@getRankings');

    cy.get('[data-testid="prediction-status-badge"]').should('not.exist');
    cy.contains('경기 시작 예정').should('not.exist');
    cy.contains('경기 종료 (9회)').should('be.visible');
    cy.contains(/SSG(\s*랜더스)? 승/).should('be.visible');
    cy.contains('스코어보드').should('be.visible');
    cy.contains(/KIA(\s*타이거즈)?/).should('be.visible');
    cy.contains(/SSG(\s*랜더스)?/).should('be.visible');
    cy.get('@getUserVote.all').should('have.length', 0);
  });
});
