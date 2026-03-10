/// <reference types="cypress" />

describe('Offseason Mode', () => {
    const mockMovements = [
        {
            id: 1,
            date: '2024-12-01',
            section: 'FA',
            team: 'KIA',
            player: '이정후',
            remarks: 'KIA 타이거즈와 200억 계약',
            isBigEvent: true,
            estimatedAmount: 200,
        },
        {
            id: 2,
            date: '2024-11-15',
            section: 'FA',
            team: 'SSG',
            player: '김광현',
            remarks: 'SSG와 50억 계약',
            isBigEvent: false,
            estimatedAmount: 50,
        },
    ];

    const mockMetadata = {
        awards: [
            { award: 'MVP', playerName: '김도영', team: 'KIA', stats: '타율 .347 / 32홈런 / 109타점' },
        ],
        postSeasonResults: [],
        finalRankings: [
            { rank: 1, teamId: 'KIA', teamName: 'KIA 타이거즈', wins: 87, losses: 55, draws: 2, winRate: '.613', games: 144 },
            { rank: 2, teamId: 'SS', teamName: '삼성 라이온즈', wins: 78, losses: 63, draws: 3, winRate: '.553', games: 144 },
        ],
    };

    describe('OffSeasonHome Page (/offseason)', () => {
        beforeEach(() => {
            cy.intercept('GET', '**/kbo/offseason/movements*', {
                statusCode: 200,
                body: mockMovements,
            }).as('getMovements');

            cy.intercept('GET', '**/kbo/offseason/metadata*', {
                statusCode: 200,
                body: mockMetadata,
            }).as('getMetadata');

            cy.intercept('GET', '**/kbo/rankings/*', {
                statusCode: 200,
                body: mockMetadata.finalRankings,
            }).as('getRankings');

            cy.visit('/offseason');
        });

        it('displays offseason page with countdown', () => {
            cy.wait('@getMovements');
            cy.wait('@getMetadata');

            cy.contains(/D-\d+|개막|시즌/i).should('be.visible');
        });

        it('shows stove league movements section', () => {
            cy.wait('@getMovements');
            cy.wait('@getMetadata');

            cy.contains(/스토브리그|이적/i).should('be.visible');
        });

        it('displays award results', () => {
            cy.wait('@getMetadata');
            cy.contains('MVP').should('be.visible');
            cy.contains('김도영').should('be.visible');
        });

        it('shows Korean Series result', () => {
            cy.wait('@getMetadata');
            cy.contains(/한국시리즈/i).should('be.visible');
            cy.contains('KIA 타이거즈').should('be.visible');
        });

        it('has a link to full transfers list', () => {
            cy.wait('@getMovements');
            cy.contains(/전체 이적|이적 현황/i).should('be.visible');
        });
    });

    describe('OffSeasonList Page (/offseason/list)', () => {
        beforeEach(() => {
            cy.intercept('GET', '**/kbo/offseason/movements*', {
                statusCode: 200,
                body: mockMovements,
            }).as('getMovements');

            cy.visit('/offseason/list');
            cy.wait('@getMovements');
        });

        it('displays the full transfers list', () => {
            cy.contains('이정후').should('be.visible');
            cy.contains('김광현').should('be.visible');
        });

        it('filters results by search input', () => {
            cy.get('input[type="text"], input[placeholder*="검색"]')
                .first()
                .type('이정후');

            cy.contains('이정후').should('be.visible');
            cy.contains('김광현').should('not.exist');
        });

        it('sorts by latest date by default', () => {
            cy.contains(/최신순|날짜순/i).should('be.visible');
        });

        it('shows contract amounts', () => {
            cy.contains(/200|억/i).should('be.visible');
        });
    });
});
