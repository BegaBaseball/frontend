/// <reference types="cypress" />

describe('Cheer Battle Connection UX', () => {
    const emptyPage = {
        content: [],
        last: true,
        totalPages: 1,
        totalElements: 0,
        size: 20,
        number: 0,
    };

    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();

        cy.intercept('GET', '**/api/kbo/schedule*', {
            statusCode: 200,
            body: [
                {
                    gameId: '2026-02-27-HH-LG',
                    time: '18:30',
                    stadium: '대전 한화생명 이글스파크',
                    gameStatus: 'PLAYING',
                    gameStatusKr: '경기중',
                    gameInfo: '정규시즌',
                    leagueType: 'REGULAR',
                    homeTeam: 'HH',
                    homeTeamFull: '한화 이글스',
                    awayTeam: 'LG',
                    awayTeamFull: 'LG 트윈스',
                },
            ],
        }).as('getScheduleWithBattle');

        cy.intercept('GET', '**/api/cheer/battle/*/status', {
            statusCode: 200,
            body: {
                stats: {
                    HH: 25,
                    LG: 20,
                },
                myVote: null,
            },
        }).as('getBattleStatus');

        cy.intercept('GET', '**/api/cheer/posts/hot*', {
            statusCode: 200,
            body: emptyPage,
        }).as('getHotPosts');

        cy.intercept('GET', '**/api/cheer/posts/following*', {
            statusCode: 200,
            body: emptyPage,
        }).as('getFollowingPosts');

        cy.intercept('GET', '**/api/cheer/posts/changes*', {
            statusCode: 200,
            body: {
                newCount: 0,
                latestId: null,
            },
        }).as('getPostChanges');

        cy.intercept('GET', '**/api/cheer/posts*', (req) => {
            if (req.url.includes('/api/cheer/posts/hot')) {
                return;
            }
            if (req.url.includes('/api/cheer/posts/following')) {
                return;
            }
            if (req.url.includes('/api/cheer/posts/changes')) {
                return;
            }
            req.reply({
                statusCode: 200,
                body: emptyPage,
            });
        }).as('getPosts');

        cy.visit('/cheer');
        cy.wait('@getScheduleWithBattle');
        cy.wait('@getBattleStatus');
        cy.get('[data-testid="cheer-battle-banner"]', { timeout: 15000 }).should('be.visible');
    });

    it('shows offline warning and manual reconnect CTA', () => {
        cy.window().then((win) => {
            win.dispatchEvent(new Event('offline'));
        });

        cy.get('[data-testid="cheer-battle-warning"]').should('be.visible');
        cy.get('[data-testid="cheer-battle-fallback-sync"]').should('contain', '최근 임시 집계');
        cy.contains('연결 대기').should('be.visible');

        cy.get('[data-testid="cheer-battle-reconnect-btn"]').click({ force: true });
        cy.get('[data-testid="cheer-battle-warning"]').should('be.visible');
    });

    it('moves to reconnecting state after network restore event', () => {
        cy.window().then((win) => {
            win.dispatchEvent(new Event('offline'));
            win.dispatchEvent(new Event('online'));
        });

        cy.get('[data-testid="cheer-battle-status"]', { timeout: 10000 }).should('contain', '재연결 중');
        cy.get('[data-testid="cheer-battle-reconnect-btn"]').should('be.visible');
        cy.get('[data-testid="cheer-battle-fallback-sync"]').should('contain', '최근 임시 집계');
    });
});
