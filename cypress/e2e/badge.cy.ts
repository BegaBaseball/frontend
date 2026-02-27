/// <reference types="cypress" />

describe('Badge Showcase in Diary Statistics', () => {
    const mockStatistics = {
        totalCount: 15,
        totalWins: 10,
        totalLosses: 5,
        totalDraws: 0,
        winRate: 66.7,
        currentWinStreak: 3,
        currentLossStreak: 0,
        avgScore: 4.2,
        homeGames: 8,
        awayGames: 7,
        bestOpponent: 'LG 트윈스',
        worstOpponent: 'KT 위즈',
        luckyDay: '토요일',
        yearlyWinRate: 66.7,
        yearlyWins: 10,
        yearlyCount: 15,
        dayOfWeekStats: {},
        earnedBadges: ['ticket', 'flame', 'map-pin'],
    };

    const openStats = () => {
        cy.contains(/통계 보기/).click();
        cy.wait('@getDiaryStats');
    };

    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();

        cy.intercept('GET', '**/api/diary/statistics*', {
            statusCode: 200,
            body: mockStatistics,
        }).as('getDiaryStats');

        cy.intercept('GET', '**/api/diary/games*', {
            statusCode: 200,
            body: [],
        }).as('getDiaryGames');

        cy.visit('/mypage');
    });

    it('renders diary statistics section with badges after clicking stats button', () => {
        openStats();
        cy.contains(/배지|Badge/i).should('be.visible');
    });

    it('shows earned badges with color and unearned badges as locked', () => {
        openStats();

        cy.contains(/업적 배지/).should('be.visible');

        cy.contains(/업적 배지/).closest('[data-slot="card"]').as('badgeCard');
        cy.get('@badgeCard').find('div.relative.w-16.h-16.rounded-full').should('have.length', 5);
        cy.get('@badgeCard').find('div.relative.w-16.h-16.rounded-full.opacity-60').should('have.length', 2);
        cy.get('@badgeCard').find('svg.lucide-lock').should('have.length', 2);
    });

    it('shows correct badge count (5 badges total)', () => {
        openStats();

        cy.contains(/업적 배지 \(3\/5\)/).should('be.visible');
        cy.contains(/나의 야구 기록 요약/).should('be.visible');
    });
});
