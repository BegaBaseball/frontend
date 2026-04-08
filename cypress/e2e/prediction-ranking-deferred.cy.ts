/// <reference types="cypress" />

import {
    installPredictionAuthenticatedSessionIntercept,
    visitPredictionPage,
} from '../support/predictionPage';

describe('Prediction Ranking Deferred', () => {
    const today = '2026-02-03';
    const nextDate = '2026-02-06';

    const buildDayResponse = (date: string, nextDateValue: string | null) => ({
        date,
        games: [
            {
                gameId: '20260203HHSS0',
                gameDate: date,
                homeTeam: 'HH',
                awayTeam: 'SS',
                stadium: '대전',
                homeScore: null,
                awayScore: null,
                winner: null,
            },
        ],
        prevDate: null,
        nextDate: nextDateValue,
        hasPrev: false,
        hasNext: Boolean(nextDateValue),
    });

    const getChunkCounts = (win: Window) => {
        const resourceEntries = win.performance.getEntriesByType('resource');
        const countChunkLoads = (chunkName: string) =>
            resourceEntries.filter((entry) => entry.name.includes(chunkName)).length;

        return {
            rankingTab: countChunkLoads('PredictionRankingTab'),
            rankingPrediction: countChunkLoads('RankingPrediction'),
            statsPanel: countChunkLoads('PredictionStatsPanel'),
            matchCard: countChunkLoads('AdvancedMatchCard'),
        };
    };

    const assertChunkCounts = (assertCounts: (counts: ReturnType<typeof getChunkCounts>) => void) => {
        cy.window().should((win) => {
            assertCounts(getChunkCounts(win));
        });
    };

    const openPredictionPage = () => {
        visitPredictionPage({
            path: '/prediction',
            token: 'prediction-ranking-deferred-token',
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.wait('@getDeferredMatchDay');
        cy.get('@getDeferredUserVoteLegacy.all').should('have.length', 0);
    };

    beforeEach(() => {
        cy.visit('about:blank');
        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        cy.mockAPI({ skipRankings: true });
        cy.clock(new Date('2026-02-03T12:00:00').getTime(), ['Date']);
        installPredictionAuthenticatedSessionIntercept('getDeferredSession');

        cy.intercept('GET', '**/api/matches/bounds*', {
            statusCode: 200,
            body: {
                hasData: true,
                earliestGameDate: '2026-02-01',
                latestGameDate: '2026-02-10',
            },
        }).as('getDeferredBounds');

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';

            if (date === today) {
                req.reply({ statusCode: 200, body: buildDayResponse(today, nextDate) });
                return;
            }

            if (date === nextDate) {
                req.reply({ statusCode: 200, body: buildDayResponse(nextDate, null) });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getDeferredMatchDay');

        cy.intercept('GET', '**/api/predictions/my-votes*', {
            statusCode: 200,
            body: { votes: {} },
        }).as('getDeferredUserVotes');

        cy.intercept('GET', '**/api/predictions/my-vote/*', {
            statusCode: 410,
            body: { message: 'legacy endpoint removed' },
        }).as('getDeferredUserVoteLegacy');

        cy.intercept('GET', '**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getDeferredVoteStatus');

        cy.intercept('GET', '**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [
                { teamId: 'HH', teamName: '한화 이글스', rank: 1, wins: 40, losses: 20, draws: 0, winRate: '0.667', games: 60, gamesBehind: 0 },
                { teamId: 'SS', teamName: '삼성 라이온즈', rank: 2, wins: 38, losses: 22, draws: 0, winRate: '0.633', games: 60, gamesBehind: 2 },
            ],
        }).as('getDeferredRankings');

        cy.intercept('GET', '**/api/prediction/stats/me*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    accuracy: 61.5,
                    totalPredictions: 13,
                    correctPredictions: 8,
                    streak: 2,
                },
            },
        }).as('getDeferredPredictionStats');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (
                req.url.includes('/api/matches/day')
                || req.url.includes('/api/matches/range')
                || req.url.includes('/api/matches/bounds')
            ) {
                return;
            }

            req.reply({
                statusCode: 200,
                body: {
                    gameId: '20260203HHSS0',
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate: today,
                    gameStatus: 'SCHEDULED',
                    gameStatusKr: '경기 예정',
                    homeScore: null,
                    awayScore: null,
                    winner: null,
                },
            });
        }).as('getDeferredGameDetail');
    });

    it('defers ranking chunks and stats query until the first ranking tab entry', () => {
        openPredictionPage();

        cy.contains('button', '경기 상세 보기').should('be.visible');
        cy.wait(1200);
        assertChunkCounts((counts) => {
            expect(counts.rankingTab).to.equal(0);
            expect(counts.rankingPrediction).to.equal(0);
            expect(counts.statsPanel).to.equal(0);
            expect(counts.matchCard).to.equal(0);
        });
        cy.get('@getDeferredPredictionStats.all').should('have.length', 0);
        cy.contains('나의 예측 퍼포먼스').should('not.exist');

        cy.contains('button', '순위예측').click({ force: true });
        cy.contains('나만의 드림팀 순위를 완성하고 친구들과 공유해보세요!').should('be.visible');
        assertChunkCounts((counts) => {
            expect(counts.rankingTab).to.be.greaterThan(0);
            expect(counts.rankingPrediction).to.be.greaterThan(0);
            expect(counts.matchCard).to.equal(0);
        });
    });
});
