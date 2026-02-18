/// <reference types="cypress" />

describe('Stadium Guide', () => {
    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();

        cy.intercept('GET', '**/api/stadiums', {
            statusCode: 200,
            body: [
                { stadiumId: '1', stadiumName: '대전 한화생명 이글스파크', lat: 36.317, lng: 127.429 },
                { stadiumId: '2', stadiumName: '잠실 야구장', lat: 37.512, lng: 127.072 }
            ]
        }).as('getStadiums');

        cy.visit('/stadium');
        cy.wait('@getStadiums');
    });

    it('should display stadium list or map', () => {
        // In StadiumGuide.tsx, it might have a select or list
        cy.get('select').should('exist');
        cy.contains('대전 한화생명 이글스파크').should('be.visible');
    });
});
