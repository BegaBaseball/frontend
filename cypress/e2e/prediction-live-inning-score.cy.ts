/// <reference types="cypress" />

import {
    installPredictionAuthenticatedSessionIntercept,
    installPredictionBootstrapIntercept,
    visitPredictionPage,
} from '../support/predictionPage';

describe('Prediction live inning score updates', () => {
    const today = '2026-02-03';
    const gameId = '20260203HHSS0';
    const initialInningScores = [
        { inning: 1, teamSide: 'away', teamCode: 'SS', runs: 1, isExtra: false },
        { inning: 1, teamSide: 'home', teamCode: 'HH', runs: 0, isExtra: false },
    ];
    const updatedInningScores = [
        { inning: 1, teamSide: 'away', teamCode: 'SS', runs: 1, isExtra: false },
        { inning: 1, teamSide: 'home', teamCode: 'HH', runs: 2, isExtra: false },
    ];

    const game = {
        gameId,
        gameDate: today,
        homeTeam: 'HH',
        awayTeam: 'SS',
        stadium: '대전',
        startTime: '18:30',
        homeScore: 0,
        awayScore: 1,
        winner: null,
        gameStatus: 'LIVE',
    };

    const detail = {
        ...game,
        stadiumName: '대전',
        attendance: null,
        weather: null,
        gameTimeMinutes: null,
        homePitcher: '홈투수',
        awayPitcher: '원정투수',
        inningScores: initialInningScores,
        summary: [],
    };

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        (cy as any).mockAPI({ skipRankings: true });
        installPredictionAuthenticatedSessionIntercept('getPredictionSessionLiveInning');

        cy.clock(new Date(`${today}T12:00:00`).getTime(), ['Date']).as('predictionClock');

        cy.intercept('**/api/predictions/my-votes*', {
            statusCode: 200,
            body: { votes: { [gameId]: null } },
        }).as('getUserVotesLiveInning');

        cy.intercept('GET', '**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getVoteStatusLiveInning');

        installPredictionBootstrapIntercept({
            alias: 'getPredictionBootstrapLiveInning',
            games: [game],
            detailByGameId: {
                [gameId]: detail,
            },
            voteStatusByGameId: {
                [gameId]: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
            },
        });

        cy.intercept('GET', `**/api/matches/${gameId}`, {
            statusCode: 200,
            body: detail,
        }).as('getGameDetailLiveInning');

        let liveSnapshotCallCount = 0;
        cy.intercept('GET', `**/api/matches/${gameId}/live*`, (req) => {
            liveSnapshotCallCount += 1;
            const isUpdatedSnapshot = liveSnapshotCallCount >= 2;

            req.reply({
                statusCode: 200,
                body: {
                    gameId,
                    gameStatus: 'LIVE',
                    homeScore: isUpdatedSnapshot ? 2 : 0,
                    awayScore: 1,
                    currentInning: 1,
                    currentInningHalf: 'BOTTOM',
                    lastEventSeq: liveSnapshotCallCount,
                    lastUpdatedAt: `2026-02-03T12:00:0${liveSnapshotCallCount}`,
                    events: [],
                    inningScores: isUpdatedSnapshot ? updatedInningScores : initialInningScores,
                },
            });
        }).as('getLiveInningSnapshot');

        cy.intercept('GET', `**/api/matches/${gameId}/live-relay*`, {
            statusCode: 409,
            body: {
                code: 'MANUAL_BASEBALL_DATA_REQUIRED',
                message: '문자중계 데이터 준비가 필요합니다.',
                data: {
                    scope: 'prediction.live_relay.events',
                    missingItems: [],
                    operatorMessage: '문자중계 데이터 준비가 필요합니다.',
                    blocking: true,
                },
            },
        }).as('getLiveRelayManualRequired');
    });

    it('updates the detail scoreboard from live inning scores without a refresh', () => {
        visitPredictionPage({
            path: `/prediction?gameId=${gameId}&date=${today}`,
            token: 'prediction-live-inning-token',
            authenticated: true,
            resetStorage: true,
        });

        cy.wait('@getPredictionBootstrapLiveInning');

        cy.get('[data-testid="prediction-scoreboard"]', { timeout: 20000 }).should('be.visible');
        cy.get('[data-testid="prediction-scoreboard-cell-away-1"]').should('have.text', '1');
        cy.get('[data-testid="prediction-scoreboard-cell-home-1"]').should('have.text', '0');
        cy.get('[data-testid="prediction-scoreboard-total-away"]').should('have.text', '1');
        cy.get('[data-testid="prediction-scoreboard-total-home"]').should('have.text', '0');

        cy.wait('@getLiveInningSnapshot');
        cy.wait('@getLiveRelayManualRequired');

        cy.get('@getLiveInningSnapshot.all').should('have.length', 1);
        cy.get('@getLiveRelayManualRequired.all').should('have.length', 1);

        cy.wait('@getLiveInningSnapshot');

        cy.get('[data-testid="prediction-scoreboard-cell-away-1"]').should('have.text', '1');
        cy.get('[data-testid="prediction-scoreboard-cell-home-1"]').should('have.text', '2');
        cy.get('[data-testid="prediction-scoreboard-total-away"]').should('have.text', '1');
        cy.get('[data-testid="prediction-scoreboard-total-home"]').should('have.text', '2');
        cy.get('@getLiveInningSnapshot.all').should('have.length', 2);
        cy.get('@getLiveRelayManualRequired.all').should('have.length', 1);
        cy.get('@getGameDetailLiveInning.all').should('have.length', 0);
    });
});
