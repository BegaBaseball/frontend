/// <reference types="cypress" />

describe('Prediction Date Boundary', () => {
    const gameDate = '2026-02-03';
    const gameId = '20260203HHSS0';

    const openPredictionPage = () => {
        cy.visit('/prediction');
        cy.tick(100);
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.wait('@getScheduleRange');
        cy.wait('@getGameDetail');
        cy.wait('@getRankingsBoundary');
        cy.wait('@getVoteStatus');
        cy.tick(100);
    };

    beforeEach(() => {
        const now = new Date('2026-02-03T00:30:00+09:00').getTime();
        cy.clock(now, ['Date']);

        cy.login('user');
        cy.mockAPI();

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
                    startTime: '18:30',
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기 예정',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            });
        }).as('getGameDetail');

        cy.intercept('POST', '**/api/predictions/my-votes', {
            statusCode: 200,
            body: {
                votes: {
                    [gameId]: null,
                },
            },
        }).as('getUserVotes');

        cy.intercept('**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getVoteStatus');

        cy.intercept('**/api/kbo/rankings/*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 7, wins: 30, losses: 50, draws: 0, winRate: '0.375', games: 80, gamesBehind: 6.0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 8, wins: 28, losses: 52, draws: 0, winRate: '0.350', games: 80, gamesBehind: 7.0 },
            ],
        }).as('getRankingsBoundary');

        cy.intercept('POST', '**/coach/analyze*', {
            statusCode: 200,
            headers: { 'content-type': 'text/event-stream' },
            body: 'event: done\ndata: [DONE]\n\n',
        }).as('coachAnalyze');
    });

    it('should treat same-day game at KST 00:30 as today, not future', () => {
        openPredictionPage();

        cy.wait('@getUserVotes');
        cy.get('[data-testid="coach-analysis-open"]').should('be.visible');
        cy.contains('요청 버튼을 눌러주세요').should('not.exist');
        cy.get('@coachAnalyze.all').should('have.length', 0);
    });
});
