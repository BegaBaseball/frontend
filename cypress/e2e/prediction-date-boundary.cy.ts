/// <reference types="cypress" />

import {
    installPredictionAuthenticatedSessionIntercept,
    installPredictionBootstrapIntercept,
    visitPredictionPage,
    waitForPredictionVoteBootstrap,
} from '../support/predictionPage';

describe('Prediction Date Boundary', () => {
    const gameDate = '2026-02-03';
    const gameId = '20260203HHSS0';
    const matchBoundsPayload = {
        hasData: true,
        earliestGameDate: '2026-02-01',
        latestGameDate: '2026-03-01',
    };
    const parseCoachRequestBody = (rawBody: unknown): Record<string, unknown> => {
        if (rawBody == null) {
            return {};
        }

        if (typeof rawBody === 'string') {
            try {
                return JSON.parse(rawBody) as Record<string, unknown>;
            } catch {
                return {};
            }
        }

        if (typeof rawBody === 'object') {
            return rawBody as Record<string, unknown>;
        }

        return {};
    };

    const openPredictionPage = () => {
        visitPredictionPage({
            path: `/prediction?gameId=${gameId}&date=${gameDate}`,
            token: 'prediction-date-boundary-token',
        });
        cy.tick(100);
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.wait('@getPredictionBootstrapBoundary');
        cy.tick(1000);
        waitForPredictionVoteBootstrap({ waitForVoteStatus: false });
        cy.tick(100);
    };

    beforeEach(() => {
        const now = new Date('2026-02-03T00:30:00+09:00').getTime();
        cy.clock(now, ['Date']);

        cy.visit('about:blank');
        cy.window().then((win) => {
            win.sessionStorage.clear();
            win.sessionStorage.removeItem('prediction:run-session:v1');
            win.sessionStorage.removeItem('prediction:run-session');
            win.localStorage.removeItem('kbo-theme');
            win.localStorage.removeItem('prediction:run-session');
            win.localStorage.removeItem('prediction:run-session:v1');
        });
        cy.mockAPI({ skipRankings: true });
        installPredictionAuthenticatedSessionIntercept('getPredictionSessionBoundary');

        cy.intercept('GET', '**/api/matches/day*', {
            statusCode: 200,
            body: {
                date: gameDate,
                games: [
                    {
                        gameId,
                        gameDate,
                        homeTeam: 'HH',
                        awayTeam: 'SS',
                        stadium: '대전',
                        leagueType: 'POST',
                        gameStatus: 'SCHEDULED',
                        gameStatusKr: '경기 예정',
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
        }).as('getScheduleRange');

        cy.intercept('GET', '**/api/matches/bounds*', {
            statusCode: 200,
            body: matchBoundsPayload,
        }).as('getMatchBoundsBoundary');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (
                req.url.includes('/api/matches/range') ||
                req.url.includes('/api/matches/day') ||
                req.url.includes('/api/matches/bounds')
            ) {
                return;
            }

            req.reply({
                statusCode: 200,
                body: {
                    gameId,
                    gameDate,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    leagueType: 'POST',
                    startTime: '18:30',
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기 예정',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            });
        }).as('getGameDetail');

        cy.intercept('**/api/predictions/my-votes*', {
            statusCode: 200,
            body: {
                votes: {
                    [gameId]: null,
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

        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrapBoundary',
            games: [
                {
                    gameId,
                    gameDate,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    leagueType: 'POST',
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기 예정',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            ],
            detailByGameId: {
                [gameId]: {
                    gameId,
                    gameDate,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    leagueType: 'POST',
                    startTime: '18:30',
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기 예정',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            },
            voteStatusByGameId: {
                [gameId]: { gameId, homeVotes: 0, awayVotes: 0, totalVotes: 0 },
            },
        });

        cy.intercept({
            method: 'GET',
            pathname: '/api/kbo/rankings/snapshot',
            middleware: true,
        }, (req) => {
            req.reply({
                statusCode: 200,
                body: [
                    { teamId: 'HH', teamName: '한화 이글스', rank: 7, wins: 30, losses: 50, draws: 0, winRate: '0.375', games: 80, gamesBehind: 6.0 },
                    { teamId: 'SS', teamName: '삼성 라이온즈', rank: 8, wins: 28, losses: 52, draws: 0, winRate: '0.350', games: 80, gamesBehind: 7.0 },
                ],
            });
        }).as('getRankingsBoundary');

        cy.intercept('POST', '**/coach/analyze*', {
            statusCode: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: 'event: done\ndata: [DONE]\n\n',
        }).as('coachAnalyze');
    });

    it('should treat same-day game at KST 00:30 as today and trigger auto briefing', () => {
        openPredictionPage();

        cy.get('[data-testid="coach-briefing-card"]').scrollIntoView().should('be.visible');
        cy.tick(500);
        cy.contains('요청 버튼을 눌러주세요').should('not.exist');
        cy.wait('@coachAnalyze').then((interception) => {
            const body = parseCoachRequestBody(interception.request.body);
            expect(body.request_mode).to.eq('auto_brief');
            expect(body.game_id).to.eq(gameId);
        });
        cy.get('@coachAnalyze.all').should('have.length', 1);
    });
});
