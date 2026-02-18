/// <reference types="cypress" />

describe('URL Capture Test', () => {
    const capturedUrls: string[] = [];

    beforeEach(() => {
        // Clear previous captures
        capturedUrls.length = 0;

        // Capture ALL API requests
        cy.intercept('**/*', (req) => {
            if (req.url.includes('/api/')) {
                const urlInfo = `${req.method} ${req.url}`;
                capturedUrls.push(urlInfo);

                Cypress.log({
                    name: 'API',
                    message: urlInfo,
                    consoleProps: () => ({
                        'Full URL': req.url,
                        'Method': req.method,
                        'Relative?': req.url.startsWith('http') ? 'NO (Absolute)' : 'YES (Relative)'
                    })
                });
            }
            req.continue();
        });

        cy.login('user');
        cy.mockAPI();
    });

    afterEach(() => {
        // Write captured URLs to console
        cy.task('log', '='.repeat(80));
        cy.task('log', 'CAPTURED API REQUESTS:');
        cy.task('log', '='.repeat(80));
        capturedUrls.forEach((url, index) => {
            cy.task('log', `${index + 1}. ${url}`);
        });
        cy.task('log', '='.repeat(80));
    });

    it('Prediction Page - Capture all API requests', () => {
        cy.visit('/prediction');
        cy.wait(3000);

        // Log summary
        cy.then(() => {
            const summary = capturedUrls.join('\n');
            expect(capturedUrls.length).to.be.greaterThan(0);
        });
    });

    it('Diary Page - Capture all API requests', () => {
        cy.visit('/mypage');
        cy.contains('직관 기록').should('be.visible');
        cy.wait(3000);

        cy.then(() => {
            expect(capturedUrls.length).to.be.greaterThan(0);
        });
    });
});
