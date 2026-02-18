/// <reference types="cypress" />

describe('AI Chatbot', () => {
    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();

        // Mock chat stream (SSE)
        cy.intercept('POST', '**/ai/chat/stream*', (req) => {
            req.reply({
                statusCode: 200,
                headers: {
                    'content-type': 'text/event-stream'
                },
                body: 'data: {"delta": "Hello! I am the KBO AI Assistant."}\n\ndata: [DONE]\n\n'
            });
        }).as('sendMessage');

        cy.visit('/home');
        // Wait for the app to hydrate - wait for the user greeting in Navbar
        cy.contains('TestUser 님', { timeout: 20000 }).should('be.visible');
    });

    it('should open chat panel and send message', () => {
        const message = 'Who is the best player?';

        // Wait for profile to load first to ensure Login status is synced
        cy.contains('TestUser 님', { timeout: 15000 }).should('be.visible');

        // The button has aria-label="챗봇 열기"
        cy.get('button[aria-label="챗봇 열기"]').should('exist').click();

        // Check for header title
        cy.contains('야구 가이드 BEGA').should('be.visible');

        // Placeholder is "메시지를 입력하세요..."
        cy.get('input[placeholder*="메시지를 입력하세요"]').should('be.enabled').type(`${message}{enter}`);

        // Check if user message appears
        cy.contains(message).should('be.visible');

        // Wait for the mock response
        cy.wait('@sendMessage', { timeout: 15000 });

        // Check for bot response
        cy.contains('Hello! I am the KBO AI Assistant.', { timeout: 10000 }).should('be.visible');
    });

    it('should close the chat panel', () => {
        cy.get('button[aria-label="챗봇 열기"]').click();
        cy.get('button[aria-label="챗봇 닫기"]').should('be.visible').click();
        cy.contains('야구 가이드 BEGA').should('not.exist');
    });
});
