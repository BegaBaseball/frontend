/// <reference types="cypress" />

describe('AI Chatbot', () => {
    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();

        // Mock chat stream (SSE)
        cy.intercept('POST', '**/ai/chat/stream*', (req) => {
            const question = String(req.body?.question || '');
            const isCachedScenario = question.toLowerCase().includes('cached');

            const normalSseBody = [
                'event: message',
                'data: {"delta": "Hello! I am the KBO AI Assistant."}',
                '',
                'event: meta',
                'data: {"verified": true, "cached": false, "intent": "freeform", "data_sources": [], "tool_calls": []}',
                '',
                'event: done',
                'data: [DONE]',
                '',
            ].join('\n');

            const cachedSseBody = [
                'event: message',
                'data: {"delta": "이 응답은 캐시에서 제공됩니다."}',
                '',
                'event: meta',
                'data: {"verified": true, "cached": true, "intent": "stats_lookup", "data_sources": [], "tool_calls": []}',
                '',
                'event: done',
                'data: [DONE]',
                '',
            ].join('\n');

            req.reply({
                statusCode: 200,
                headers: {
                    'content-type': 'text/event-stream'
                },
                body: isCachedScenario ? cachedSseBody : normalSseBody
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

    it('should show fast response badge for cached replies', () => {
        const message = 'please send cached response';

        cy.get('button[aria-label="챗봇 열기"]').should('exist').click();
        cy.get('input[placeholder*="메시지를 입력하세요"]').should('be.enabled').type(`${message}{enter}`);

        cy.wait('@sendMessage', { timeout: 15000 });
        cy.contains('이 응답은 캐시에서 제공됩니다.', { timeout: 10000 }).should('be.visible');
        cy.contains('빠른 응답').should('be.visible');
    });

    it('should close the chat panel', () => {
        cy.get('button[aria-label="챗봇 열기"]').click();
        cy.get('button[aria-label="챗봇 닫기"]').should('be.visible').click();
        cy.contains('야구 가이드 BEGA').should('not.exist');
    });
});
