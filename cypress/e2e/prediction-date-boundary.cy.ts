/// <reference types="cypress" />

describe('Prediction Date Boundary', () => {
    const gameDate = '2026-02-03';
    const gameId = '20260203HHSS0';

    const openPredictionPage = () => {
        const cacheBuster = Date.now();
        cy.window().then((win) => {
            win.location.assign(`/prediction?_cypress_bust=${cacheBuster}`);
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.wait('@getScheduleRange');
        cy.wait('@getGameDetail');
        cy.wait('@getRankingsBoundary');
    };

    beforeEach(() => {
        const now = new Date('2026-02-03T00:30:00+09:00').getTime();
        cy.clock(now, ['Date']);

        cy.login('user');
        cy.mockAPI();

        cy.intercept('**/api/matches/range*', {
            statusCode: 200,
            body: [
                {
                    gameId,
                    gameDate,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            ],
        }).as('getScheduleRange');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (req.url.includes('/api/matches/range')) {
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
            body: { homeVotes: 0, awayVotes: 0 },
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
        cy.contains('요청 버튼을 눌러주세요').should('be.visible');
        cy.contains('경기 시작 전입니다').should('not.exist');
        cy.contains('핵심 경기만 자동 분석을 제공합니다. 필요한 경기에서는 직접 AI 분석을 요청하세요.').should('be.visible');
        cy.get('@coachAnalyze.all').should('have.length', 0);
    });
});
