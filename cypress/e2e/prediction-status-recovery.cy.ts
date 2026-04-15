/// <reference types="cypress" />

import type { CyHttpMessages } from 'cypress/types/net-stubbing';
import {
  installPredictionAuthenticatedSessionIntercept,
  visitPredictionPage,
} from '../support/predictionPage';

describe('Prediction status recovery', () => {
  const targetGameId = '20260201KIASK0';
  const targetDate = '2026-02-01';
  const authToken = 'prediction-status-recovery-token';
  const replyJson = (req: CyHttpMessages.IncomingHttpRequest, payload: unknown, statusCode: number = 200) => {
    req.reply({
      statusCode,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  };

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
    { inning: 10, teamCode: 'KIA', teamSide: 'away', runs: 0, isExtra: true },
    { inning: 10, teamCode: 'SSG', teamSide: 'home', runs: 0, isExtra: true },
    { inning: 11, teamCode: 'KIA', teamSide: 'away', runs: 0, isExtra: true },
    { inning: 11, teamCode: 'SSG', teamSide: 'home', runs: 0, isExtra: true },
    { inning: 12, teamCode: 'KIA', teamSide: 'away', runs: 0, isExtra: true },
    { inning: 12, teamCode: 'SSG', teamSide: 'home', runs: 0, isExtra: true },
  ];

  beforeEach(() => {
    cy.visit('about:blank');
    cy.window().then((win) => {
      win.sessionStorage.clear();
      win.sessionStorage.removeItem('prediction:run-session:v1');
      win.sessionStorage.removeItem('prediction:run-session');
      win.localStorage.removeItem('kbo-theme');
      win.localStorage.removeItem('prediction:run-session');
      win.localStorage.removeItem('prediction:run-session:v1');
    });
    cy.clearCookies();
    cy.clearLocalStorage();
    (cy as any).mockAPI({ skipRankings: true });
    installPredictionAuthenticatedSessionIntercept('getPredictionSessionStatusRecovery');

    cy.intercept('GET', '**/api/matches/day*', (req) => {
      replyJson(req, {
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
      });
    }).as('getScheduleDay');

    cy.intercept('GET', '**/api/matches/bounds*', (req) => {
      replyJson(req, {
        hasData: true,
        earliestGameDate: targetDate,
        latestGameDate: targetDate,
      });
    }).as('getMatchBounds');

    cy.intercept('GET', '**/api/matches/*', (req) => {
      if (
        req.url.includes('/api/matches/range')
        || req.url.includes('/api/matches/day')
        || req.url.includes('/api/matches/bounds')
      ) {
        return;
      }

      replyJson(req, {
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
      });
    }).as('getGameDetail');

    cy.intercept('**/api/predictions/my-votes*', (req) => {
      replyJson(req, {
        votes: {
          [targetGameId]: null,
        },
      });
    }).as('getUserVotes');

    cy.intercept('GET', '**/api/predictions/my-vote/*', (req) => {
      replyJson(req, { message: 'legacy endpoint removed' }, 410);
    }).as('getUserVote');

    cy.intercept('**/api/predictions/status/*', (req) => {
      replyJson(req, { homeVotes: 0, awayVotes: 0, totalVotes: 0 });
    }).as('getVoteStatus');

    cy.intercept({
      method: 'GET',
      pathname: '/api/kbo/rankings/snapshot',
      middleware: true,
    }, (req) => {
      replyJson(req, []);
    }).as('getRankings');

    cy.intercept('**/api/kbo/league-start-dates*', (req) => {
      replyJson(req, {
        regularSeasonStart: '2025-03-22',
        postseasonStart: '2025-10-06',
        koreanSeriesStart: '2025-10-26',
      });
    }).as('getLeagueDates');

    cy.intercept('POST', '**/coach/analyze*', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: 'event: done\ndata: [DONE]\n\n',
    }).as('coachAnalyze');
  });

  it('shows the actual result instead of the scheduled banner when inning data exists', () => {
    visitPredictionPage({
      path: `/prediction?gameId=${targetGameId}&date=${targetDate}`,
      token: authToken,
      resetStorage: true,
    });

    cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    cy.wait('@getScheduleDay');
    cy.wait('@getGameDetail');

    cy.get('body').then(($body) => {
      const detailButton = [...$body.find('button')].find((button) => (
        button.textContent?.includes('경기 상세 보기')
      ));
      if (detailButton) {
        cy.wrap(detailButton).click({ force: true });
      }
    });

    cy.get('[data-testid="prediction-status-badge"]').should('not.exist');
    cy.contains('경기 시작 예정').should('not.exist');
    cy.contains('경기 종료 (9회)', { timeout: 20000 }).should('be.visible');
    cy.contains('경기 종료 (12회)').should('not.exist');
    cy.contains(/SSG(\s*랜더스)? 승/).should('be.visible');
    cy.contains('스코어보드').should('be.visible');
    cy.contains('연장이닝 보기').should('not.exist');
    cy.contains(/KIA(\s*타이거즈)?/).should('be.visible');
    cy.contains(/SSG(\s*랜더스)?/).should('be.visible');
    cy.get('@getUserVote.all').should('have.length', 0);
  });
});
