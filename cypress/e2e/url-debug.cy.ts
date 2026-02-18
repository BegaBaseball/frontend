/// <reference types="cypress" />

describe('URL Debug Test', () => {
    beforeEach(() => {
        // Capture ALL requests to see what's actually being called
        cy.intercept('**/*', (req) => {
            if (req.url.includes('/api/')) {
                // Log to Cypress command log (visible in UI)
                Cypress.log({
                    name: 'API Request',
                    message: req.url,
                    consoleProps: () => ({
                        'Full URL': req.url,
                        'Method': req.method,
                        'Headers': req.headers
                    })
                });
            }
            req.continue();
        });

        cy.login('user');
        cy.mockAPI();
    });

    it('should capture prediction page requests', () => {
        cy.visit('/prediction');
        cy.wait(5000); // Wait to see all requests
    });

    it('should capture diary page requests', () => {
        cy.visit('/mypage');
        cy.wait(5000); // Wait to see all requests
    });
});
