/// <reference types="cypress" />

describe('Prediction Lazy Load', () => {
    const today = '2026-02-03';
    const previousDate = '2026-02-02';
    const nextDate = '2026-02-06';
    const emptyStateText = /오늘은 예정된 경기가 없습니다\.|예정된 경기 일정이 없습니다\./;

    const baseRankings = [
        { teamId: 'HH', teamName: '한화 이글스', rank: 7, wins: 30, losses: 50, draws: 0, winRate: '0.375', games: 80, gamesBehind: 6.0 },
        { teamId: 'SS', teamName: '삼성 라이온즈', rank: 8, wins: 28, losses: 52, draws: 0, winRate: '0.350', games: 80, gamesBehind: 7.0 },
    ];

    const buildDayResponse = (
        date: string,
        games: Array<Record<string, unknown>>,
        prevDateValue: string | null,
        nextDateValue: string | null
    ) => ({
        date,
        games,
        prevDate: prevDateValue,
        nextDate: nextDateValue,
        hasPrev: Boolean(prevDateValue),
        hasNext: Boolean(nextDateValue),
    });

    const installCommonPredictionIntercepts = () => {
        cy.intercept('POST', '**/api/predictions/my-votes', {
            statusCode: 200,
            body: { votes: {} },
        }).as('getUserVotesLazy');

        cy.intercept('GET', '**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getVoteStatusLazy');

        cy.intercept('GET', '**/api/kbo/rankings/*', {
            statusCode: 200,
            body: baseRankings,
        }).as('getRankingsLazy');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (
                req.url.includes('/api/matches/day')
                || req.url.includes('/api/matches/range')
                || req.url.includes('/api/matches/bounds')
            ) {
                return;
            }

            const gameId = req.url.split('/').pop() || '20260206HHSS0';
            const datePrefix = gameId.slice(0, 8);
            const gameDate = `${datePrefix.slice(0, 4)}-${datePrefix.slice(4, 6)}-${datePrefix.slice(6, 8)}`;

            req.reply({
                statusCode: 200,
                body: {
                    gameId,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate,
                    homeScore: null,
                    awayScore: null,
                },
            });
        }).as('getGameDetailLazy');
    };

    const openPredictionPage = () => {
        const cacheBuster = Date.now();
        cy.window().then((win) => {
            win.location.assign(`/prediction?_cypress_bust=${cacheBuster}`);
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.wait('@getMatchDay');
    };

    beforeEach(() => {
        cy.visit('about:blank');
        cy.login('user');
        cy.mockAPI();
        installCommonPredictionIntercepts();
        const now = new Date('2026-02-03T12:00:00').getTime();
        cy.clock(now, ['Date']);
    });

    it('loads today once and immediately prefetches only adjacent dates', () => {
        const requestedDates: string[] = [];

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [
                        {
                            gameId: '20260203HHSS0',
                            gameDate: today,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], previousDate, nextDate),
                });
                return;
            }

            if (date === previousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(previousDate, [], null, today),
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [
                        {
                            gameId: '20260206HHSS0',
                            gameDate: nextDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], today, null),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDay');

        openPredictionPage();
        cy.wait('@getMatchDay');
        cy.wait('@getMatchDay');

        cy.wrap(null).then(() => {
            expect(requestedDates).to.deep.equal([today, previousDate, nextDate]);
        });
    });

    it('moves to the prefetched next date without issuing an extra day request', () => {
        const requestedDates: string[] = [];

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [], previousDate, nextDate),
                });
                return;
            }

            if (date === previousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(previousDate, [], null, today),
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [
                        {
                            gameId: '20260206HHSS0',
                            gameDate: nextDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], today, null),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDay');

        openPredictionPage();
        cy.wait('@getMatchDay');
        cy.wait('@getMatchDay');
        cy.wrap(null).should(() => {
            expect(requestedDates).to.have.members([today, previousDate, nextDate]);
        });
        cy.contains(emptyStateText).should('be.visible');

        cy.get('button[aria-label="다음 날짜 보기"]').first().click({ force: true });
        cy.get('[data-testid="vote-home-btn"]').should('exist');
        cy.contains('2026.02.06').should('be.visible');

        cy.wrap(null).then(() => {
            expect(requestedDates).to.have.members([today, previousDate, nextDate]);
        });
    });

    it('offers a quick action to jump to the nearest available game date from the empty state', () => {
        const requestedDates: string[] = [];

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [], previousDate, null),
                });
                return;
            }

            if (date === previousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(previousDate, [
                        {
                            gameId: '20260202HHSS0',
                            gameDate: previousDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: 4,
                            awayScore: 2,
                            winner: 'home',
                        },
                    ], null, today),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDay');

        openPredictionPage();
        cy.wait('@getMatchDay');

        cy.get('[data-testid="prediction-empty-nearest-date-btn"]')
            .should('be.visible')
            .should('contain.text', '가장 가까운 이전 경기 보기')
            .click();

        cy.wait('@getGameDetailLazy');
        cy.contains('2026.02.02').should('be.visible');
        cy.contains('삼성 라이온즈').should('be.visible');

        cy.wrap(null).then(() => {
            expect(requestedDates).to.deep.equal([today, previousDate]);
        });
    });

    it('moves to the prefetched previous date without issuing an extra day request', () => {
        const requestedDates: string[] = [];

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [], previousDate, nextDate),
                });
                return;
            }

            if (date === previousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(previousDate, [
                        {
                            gameId: '20260202HHSS0',
                            gameDate: previousDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], null, today),
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [], today, null),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getMatchDay');

        openPredictionPage();
        cy.wait('@getMatchDay');
        cy.wait('@getMatchDay');
        cy.wrap(null).should(() => {
            expect(requestedDates).to.have.members([today, previousDate, nextDate]);
        });
        cy.contains(emptyStateText).should('be.visible');

        cy.get('button[aria-label="이전 날짜 보기"]').first().click({ force: true });
        cy.wait('@getGameDetailLazy');
        cy.contains('2026.02.02').should('be.visible');
        cy.contains('삼성 라이온즈').should('be.visible');
        cy.wrap(null).then(() => {
            expect(requestedDates).to.have.members([today, previousDate, nextDate]);
        });
    });

    it('retries the target day on click when background prefetch failed', () => {
        let nextDateRequestCount = 0;

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [], null, nextDate),
                });
                return;
            }

            if (date === nextDate) {
                nextDateRequestCount += 1;
                if (nextDateRequestCount === 1) {
                    req.reply({
                        statusCode: 500,
                        body: { message: 'prefetch failed' },
                    });
                    return;
                }

                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [
                        {
                            gameId: '20260206HHSS0',
                            gameDate: nextDate,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], today, null),
                });
                return;
            }

            req.reply({
                statusCode: 200,
                body: buildDayResponse(previousDate, [], null, today),
            });
        }).as('getMatchDay');

        openPredictionPage();
        cy.wait('@getMatchDay');
        cy.contains(emptyStateText).should('be.visible');

        cy.get('button[aria-label="다음 날짜 보기"]').first().click({ force: true });
        cy.contains('2026.02.06').should('be.visible');
        cy.wrap(null).then(() => {
            expect(nextDateRequestCount).to.eq(2);
        });
    });
});

describe('Prediction Public Access', () => {
    const today = '2026-02-03';
    const previousDate = '2026-02-02';
    const nextDate = '2026-02-06';
    const baseRankings = [
        { teamId: 'HH', teamName: '한화 이글스', rank: 7, wins: 30, losses: 50, draws: 0, winRate: '0.375', games: 80, gamesBehind: 6.0 },
        { teamId: 'SS', teamName: '삼성 라이온즈', rank: 8, wins: 28, losses: 52, draws: 0, winRate: '0.350', games: 80, gamesBehind: 7.0 },
    ];

    const buildDayResponse = (
        date: string,
        games: Array<Record<string, unknown>>,
        prevDateValue: string | null,
        nextDateValue: string | null
    ) => ({
        date,
        games,
        prevDate: prevDateValue,
        nextDate: nextDateValue,
        hasPrev: Boolean(prevDateValue),
        hasNext: Boolean(nextDateValue),
    });

    const installGuestPredictionIntercepts = () => {
        cy.intercept('GET', '**/api/predictions/status/*', {
            statusCode: 200,
            body: { homeVotes: 0, awayVotes: 0, totalVotes: 0 },
        }).as('getGuestVoteStatusLazy');

        cy.intercept('GET', '**/api/kbo/rankings/*', {
            statusCode: 200,
            body: baseRankings,
        }).as('getGuestRankingsLazy');

        cy.intercept('GET', '**/api/matches/*', (req) => {
            if (
                req.url.includes('/api/matches/day')
                || req.url.includes('/api/matches/range')
                || req.url.includes('/api/matches/bounds')
            ) {
                return;
            }

            const gameId = req.url.split('/').pop() || '20260203HHSS0';
            const datePrefix = gameId.slice(0, 8);
            const gameDate = `${datePrefix.slice(0, 4)}-${datePrefix.slice(4, 6)}-${datePrefix.slice(6, 8)}`;

            req.reply({
                statusCode: 200,
                body: {
                    gameId,
                    homeTeam: 'HH',
                    awayTeam: 'SS',
                    stadium: '대전',
                    gameDate,
                    homeScore: null,
                    awayScore: null,
                },
            });
        }).as('getGuestGameDetailLazy');
    };

    const openPredictionPageAsGuest = () => {
        const cacheBuster = Date.now();
        cy.visit(`/prediction?_cypress_bust=${cacheBuster}`, {
            onBeforeLoad(win) {
                win.localStorage.removeItem('auth-storage');
                win.localStorage.removeItem('accessToken');
                win.localStorage.setItem('bega_has_visited', 'true');
                win.localStorage.setItem('bega_dont_show_guide', 'true');
            },
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    };

    beforeEach(() => {
        cy.visit('about:blank');
        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        cy.mockAPI();
        installGuestPredictionIntercepts();
        cy.clock(new Date('2026-02-03T12:00:00').getTime(), ['Date']);
        cy.intercept('GET', '**/auth/mypage*', {
            statusCode: 401,
            body: {
                message: 'Unauthorized',
            },
        }).as('getGuestSession');
    });

    it('loads public match day data for guests without requesting my-votes', () => {
        const requestedDates: string[] = [];
        let myVotesCallCount = 0;

        cy.intercept('POST', '**/api/predictions/my-votes', (req) => {
            myVotesCallCount += 1;
            req.reply({
                statusCode: 200,
                body: { votes: {} },
            });
        }).as('getGuestUserVotesLazy');

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const url = new URL(req.url);
            const date = url.searchParams.get('date') || '';
            requestedDates.push(date);

            if (date === today) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(today, [
                        {
                            gameId: '20260203HHSS0',
                            gameDate: today,
                            homeTeam: 'HH',
                            awayTeam: 'SS',
                            stadium: '대전',
                            homeScore: null,
                            awayScore: null,
                            winner: null,
                        },
                    ], previousDate, nextDate),
                });
                return;
            }

            if (date === previousDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(previousDate, [], null, today),
                });
                return;
            }

            if (date === nextDate) {
                req.reply({
                    statusCode: 200,
                    body: buildDayResponse(nextDate, [], today, null),
                });
                return;
            }

            req.reply({ statusCode: 404, body: { message: `Unexpected date ${date}` } });
        }).as('getGuestMatchDay');

        openPredictionPageAsGuest();
        cy.wait('@getGuestSession');
        cy.wait('@getGuestMatchDay');
        cy.wait('@getGuestMatchDay');
        cy.wait('@getGuestMatchDay');

        cy.contains('전력분석실').should('be.visible');
        cy.wrap(null).then(() => {
            expect(requestedDates).to.deep.equal([today, previousDate, nextDate]);
            expect(myVotesCallCount).to.equal(0);
        });
    });
});
