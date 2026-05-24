/// <reference types="cypress" />

import { installPredictionAuthenticatedSessionIntercept, visitPredictionPage } from '../support/predictionPage';

type PreviewPitcher = {
    name: string;
    era?: string | null;
    win?: number | null;
    loss?: number | null;
};

type PreviewGame = {
    gameId: string;
    gameDate: string;
    awayTeam: string;
    homeTeam: string;
    stadium: string;
    startTime: string;
    gameStatus: string;
    awayScore: number | null;
    homeScore: number | null;
    winner: string | null;
    awayPitcher?: PreviewPitcher | null;
    homePitcher?: PreviewPitcher | null;
    aiSummary?: string | null;
};

describe('Prediction preview schedule', () => {
    const targetDate = '2099-05-01';
    const secondGameId = '20990501LGKT0';
    const baseGames: PreviewGame[] = [
        {
            gameId: '20990501KIANC0',
            gameDate: targetDate,
            awayTeam: 'KIA',
            homeTeam: 'NC',
            stadium: '창원',
            startTime: '18:30:00',
            gameStatus: 'SCHEDULED',
            awayScore: null,
            homeScore: null,
            winner: null,
            awayPitcher: {
                name: '이의리',
            },
            homePitcher: {
                name: '구창모',
            },
        },
        {
            gameId: secondGameId,
            gameDate: targetDate,
            awayTeam: 'LG',
            homeTeam: 'KT',
            stadium: '수원',
            startTime: '18:30:00',
            gameStatus: 'SCHEDULED',
            awayScore: null,
            homeScore: null,
            winner: null,
            awayPitcher: {
                name: '이정용',
            },
            homePitcher: {
                name: '소형준',
            },
        },
    ];

    const buildDayResponse = (
        games: PreviewGame[],
        options: { prevDate?: string | null; nextDate?: string | null } = {},
        date = targetDate,
    ) => ({
        date,
        games,
        prevDate: options.prevDate ?? null,
        nextDate: options.nextDate ?? null,
        hasPrev: Boolean(options.prevDate),
        hasNext: Boolean(options.nextDate),
    });

    const interceptPreviewApis = (
        games: PreviewGame[] = baseGames,
        options: { prevDate?: string | null; nextDate?: string | null } = {},
        gamesByDate?: Record<string, PreviewGame[]>,
    ) => {
        const dayGamesByDate = gamesByDate ?? { [targetDate]: games };
        const allGames = Object.values(dayGamesByDate).flat();

        cy.mockAPI({ skipRankings: true });
        installPredictionAuthenticatedSessionIntercept('getPredictionPreviewSession');

        cy.intercept('GET', '**/api/kbo/rankings/snapshot*', {
            statusCode: 200,
            body: [],
        }).as('getRankingsPreview');

        cy.intercept('GET', '**/api/matches/bounds*', {
            statusCode: 200,
            body: {
                hasData: true,
                earliestGameDate: '2099-04-30',
                latestGameDate: targetDate,
            },
        }).as('getMatchBoundsPreview');

        cy.intercept('GET', /\/api\/matches\/(?!day|range|bounds)[^/?#]+(?:\?.*)?$/, (req) => {
            const gameId = req.url.split('/').pop()?.split('?')[0] || '';
            const game = allGames.find((candidate) => candidate.gameId === gameId) || allGames[0];
            if (!game) {
                req.reply({
                    statusCode: 404,
                    body: { message: 'Not found' },
                });
                return;
            }
            req.reply({
                statusCode: 200,
                body: {
                    ...game,
                    homePitcher: game?.homePitcher?.name ?? null,
                    awayPitcher: game?.awayPitcher?.name ?? null,
                    inningScores: [],
                    summary: [],
                },
            });
        }).as('getGameDetailPreview');

        cy.intercept('GET', '**/api/matches/day*', (req) => {
            const requestedUrl = new URL(req.url);
            const requestedDate = requestedUrl.searchParams.get('date') || targetDate;
            req.reply({
                statusCode: 200,
                body: buildDayResponse(dayGamesByDate[requestedDate] ?? [], options, requestedDate),
            });
        }).as('getMatchDayPreview');
    };

    const openPreview = () => {
        visitPredictionPage({
            path: `/prediction?date=${targetDate}`,
            token: 'prediction-preview-card-token',
            resetStorage: true,
        });
        cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
        cy.wait('@getMatchDayPreview');
    };

    beforeEach(() => {
        cy.visit('about:blank');
    });

    [
        { label: 'mobile-360', width: 360, height: 740, isCompact: true },
        { label: 'mobile-390', width: 390, height: 844, isCompact: true },
        { label: 'mobile-430', width: 430, height: 932, isCompact: true },
        { label: 'tablet-640', width: 640, height: 900, isCompact: true },
        { label: 'tablet-768', width: 768, height: 900, isCompact: true },
        { label: 'tablet-940', width: 940, height: 900, isCompact: true },
        { label: 'desktop-1024', width: 1024, height: 768, isCompact: false },
        { label: 'desktop-1280', width: 1280, height: 720, isCompact: false },
    ].forEach(({ label, width, height, isCompact }) => {
        it(`shows the date rail and KBO schedule rows at ${label} viewport`, () => {
            cy.viewport(width, height);
            interceptPreviewApis();
            openPreview();

            cy.get('[data-testid="prediction-schedule-date-rail"]').should('be.visible');
            cy.get('[data-testid="prediction-schedule-date-rail-fade"]').should('exist');
            cy.get('[data-testid="prediction-schedule-month-title"]').should('contain', '2099.05');
            cy.get('[data-testid="prediction-match-preview-root"]').should('be.visible').within(() => {
                cy.contains('KBO리그').should('be.visible');
                cy.get('[data-testid="prediction-schedule-match-row"]').should('have.length', 2);
                cy.get('[data-game-id="20990501KIANC0"]').should('contain', 'KIA').and('contain', '예정').and('contain', 'NC');
                cy.get(`[data-game-id="${secondGameId}"]`).should('contain', 'LG').and('contain', '예정').and('contain', 'KT');
                cy.get('[data-testid="prediction-match-enter-detail-btn"]').should('have.length', 2);
            });

            cy.get('[data-game-id="20990501KIANC0"] [data-testid="prediction-match-enter-detail-btn"]')
                .then(($button) => {
                    cy.get('[data-testid="prediction-match-preview-root"]').then(($card) => {
                        const buttonRect = $button[0].getBoundingClientRect();
                        const cardRect = $card[0].getBoundingClientRect();
                        expect(buttonRect.left).to.be.greaterThan(cardRect.left - 1);
                        expect(buttonRect.right).to.be.lessThan(cardRect.right + 1);
                    });
                });

            if (!isCompact) {
                cy.get('[data-game-id="20990501KIANC0"]').then(($row) => {
                    cy.get('[data-game-id="20990501KIANC0"] [data-testid="prediction-schedule-matchup"]').then(($matchup) => {
                        const rowRect = $row[0].getBoundingClientRect();
                        const matchupRect = $matchup[0].getBoundingClientRect();
                        const rowCenter = rowRect.left + rowRect.width / 2;
                        const matchupCenter = matchupRect.left + matchupRect.width / 2;
                        expect(Math.abs(matchupCenter - rowCenter)).to.be.lessThan(10);
                    });
                });
            }

            if (isCompact) {
                cy.get('[data-testid="prediction-schedule-match-list"]').then(($list) => {
                    expect($list[0].scrollWidth).to.be.lessThan($list[0].clientWidth + 2);
                });

                cy.get('[data-game-id="20990501KIANC0"]').within(() => {
                    cy.get('img[alt*="로고"]').should('have.length.at.least', 2);
                    cy.get('img[alt*="로고"]').first().should('be.visible');
                    cy.get('[data-testid="prediction-match-enter-detail-btn"]').should('be.visible');
                });
            }

            cy.get('[data-testid="prediction-match-preview-root"]').should('not.contain', '응원');
            cy.contains('경기 상세 보기').should('not.exist');
            cy.get('@getGameDetailPreview.all').should('have.length', 0);
        });
    });

    it('loads new preview dates from the date rail and native date input', () => {
        const railDate = '2099-05-02';
        const nativeInputDate = '2099-05-03';
        const railDateGame: PreviewGame = {
            ...baseGames[0],
            gameId: '20990502KIANC0',
            gameDate: railDate,
            stadium: '광주',
        };
        const nativeDateGame: PreviewGame = {
            ...baseGames[1],
            gameId: '20990503LGKT0',
            gameDate: nativeInputDate,
            stadium: '잠실',
        };

        cy.viewport(1280, 720);
        interceptPreviewApis(baseGames, {}, {
            [targetDate]: baseGames,
            [railDate]: [railDateGame],
            [nativeInputDate]: [nativeDateGame],
        });
        openPreview();

        cy.get(`[data-testid="prediction-schedule-date-button"][data-date="${railDate}"]`).click();
        cy.wait('@getMatchDayPreview').its('request.url').should('include', `date=${railDate}`);
        cy.get(`[data-game-id="${railDateGame.gameId}"]`).should('contain', '광주');

        cy.get('[data-testid="prediction-schedule-date-input"]')
            .clear({ force: true })
            .type(nativeInputDate, { force: true });
        cy.wait('@getMatchDayPreview').its('request.url').should('include', `date=${nativeInputDate}`);
        cy.get(`[data-game-id="${nativeDateGame.gameId}"]`).should('contain', '잠실');
    });

    it('opens the selected game detail only after clicking its power-analysis button', () => {
        cy.viewport(1280, 720);
        interceptPreviewApis();
        openPreview();
        cy.get('@getGameDetailPreview.all').should('have.length', 0);

        cy.get(`[data-game-id="${secondGameId}"] [data-testid="prediction-match-enter-detail-btn"]`)
            .scrollIntoView()
            .click();

        cy.location('search', { timeout: 20000 }).should('include', `gameId=${secondGameId}`);
        cy.location('search').should('include', `date=${targetDate}`);
        cy.wait('@getGameDetailPreview');
    });

    it('hides the power-analysis button for postponed and cancelled games', () => {
        cy.viewport(390, 844);
        interceptPreviewApis([
            {
                ...baseGames[0],
                gameId: '20990501KIANC1',
                gameStatus: 'POSTPONED',
            },
            {
                ...baseGames[1],
                gameId: '20990501LGKT1',
                gameStatus: 'CANCELLED',
            },
        ]);
        openPreview();

        cy.get('[data-testid="prediction-schedule-match-row"]').should('have.length', 2);
        cy.contains('연기').should('exist');
        cy.contains('취소').should('exist');
        cy.get('[data-testid="prediction-match-enter-detail-btn"]').should('not.exist');
        cy.get('@getGameDetailPreview.all').should('have.length', 0);
    });

    it('keeps the empty schedule state and nearest-date action for no-game dates', () => {
        cy.viewport(390, 844);
        interceptPreviewApis([], { prevDate: '2099-04-30' });
        openPreview();

        cy.get('[data-testid="prediction-schedule-date-rail"]').should('be.visible');
        cy.contains('예정된 경기 일정이 없습니다.').should('be.visible');
        cy.get('[data-testid="prediction-empty-nearest-date-btn"]').should('be.visible');
        cy.get('@getGameDetailPreview.all').should('have.length', 0);
    });
});
