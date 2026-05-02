/// <reference types="cypress" />

import { visitPredictionPage } from '../support/predictionPage';

const selectedTeamIds = ['samsung', 'lg', 'doosan'] as const;

const installRankingPredictionMocks = () => {
    cy.mockAPI({ skipRankings: true });

    cy.intercept('GET', /\/api\/predictions\/ranking\/current-season(?:\?.*)?$/, {
        statusCode: 200,
        body: { seasonYear: 2026 },
    }).as('getRankingPredictionSeason');

    cy.intercept('GET', /\/api\/predictions\/ranking(?:\?.*)?$/, {
        statusCode: 404,
        body: { message: '저장된 순위 예측이 없습니다.' },
    }).as('getSavedRankingPrediction');
};

const openRankingPrediction = () => {
    visitPredictionPage({
        path: '/prediction',
        token: 'prediction-ranking-reorder-token',
        resetStorage: true,
    });

    cy.contains('button', '순위예측', { timeout: 20000 }).click({ force: true });
    cy.wait('@getRankingPredictionSeason');
    cy.wait('@getSavedRankingPrediction');
    cy.get('[data-testid="ranking-root"]').within(() => {
        cy.contains('예상 순위').should('be.visible');
    });
};

const addThreeTeams = () => {
    selectedTeamIds.forEach((teamId) => {
        cy.get(`[data-testid="ranking-team-option-${teamId}"]`).click();
    });
};

const assertPlacedTeamOrder = (expectedTeamIds: string[]) => {
    cy.get('[data-testid="ranking-list"] [data-ranking-item][data-team-id]').then(($rows) => {
        const actualTeamIds = Array.from($rows)
            .slice(0, expectedTeamIds.length)
            .map((row) => row.getAttribute('data-team-id'));

        expect(actualTeamIds).to.deep.equal(expectedTeamIds);
    });
};

const assertNoAmbiguousMotionClass = (teamId: string) => {
    cy.get(`[data-testid="ranking-row-${teamId}"]`).should(($row) => {
        const className = $row.attr('class') || '';
        expect(className).not.to.include('opacity-40');
        expect(className).not.to.include('scale-95');
    });
};

const assertTouchTarget = (selector: string, label: string) => {
    cy.get(selector).should(($button) => {
        const rect = $button[0].getBoundingClientRect();
        expect(rect.width, `${label} width`).to.be.at.least(44);
        expect(rect.height, `${label} height`).to.be.at.least(44);
    });
};

describe('Prediction ranking reorder UX', () => {
    beforeEach(() => {
        cy.viewport(390, 844);
        cy.visit('about:blank');
        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        installRankingPredictionMocks();
    });

    it('moves a selected team with 44px controls and confirms the new rank clearly', () => {
        openRankingPrediction();
        addThreeTeams();

        assertPlacedTeamOrder(['samsung', 'lg', 'doosan']);
        assertTouchTarget('[data-testid="ranking-move-down-samsung"]', 'ranking move down');
        assertTouchTarget('[data-testid="ranking-move-up-lg"]', 'ranking move up');

        cy.get('[data-testid="ranking-move-down-samsung"]').click();

        assertPlacedTeamOrder(['lg', 'samsung', 'doosan']);
        cy.get('[data-testid="ranking-reorder-feedback"]')
            .should('contain.text', '삼성 라이온즈 2위로 이동했습니다.');
        assertNoAmbiguousMotionClass('samsung');

        cy.get('[data-testid="ranking-move-up-samsung"]').click();

        assertPlacedTeamOrder(['samsung', 'lg', 'doosan']);
        cy.get('[data-testid="ranking-reorder-feedback"]')
            .should('contain.text', '삼성 라이온즈 1위로 이동했습니다.');
        assertNoAmbiguousMotionClass('samsung');
    });

    it('keeps drag reorder visually stable without faded snapback styling', () => {
        openRankingPrediction();
        addThreeTeams();

        cy.window().then((win) => {
            const dataTransfer = new win.DataTransfer();

            cy.get('[data-testid="ranking-row-samsung"]')
                .trigger('dragstart', { dataTransfer })
                .then(($row) => {
                    const className = $row.attr('class') || '';
                    expect(className).not.to.include('opacity-40');
                    expect(className).not.to.include('scale-95');
                });

            cy.get('[data-testid="ranking-row-doosan"]').trigger('dragover', { dataTransfer });
            cy.get('[data-testid="ranking-row-samsung"]').trigger('drop', { dataTransfer });
            cy.get('[data-testid="ranking-row-samsung"]').trigger('dragend', { dataTransfer });
        });

        assertPlacedTeamOrder(['lg', 'doosan', 'samsung']);
        cy.get('[data-testid="ranking-reorder-feedback"]')
            .should('contain.text', '삼성 라이온즈 3위로 이동했습니다.');
        assertNoAmbiguousMotionClass('samsung');
    });
});
