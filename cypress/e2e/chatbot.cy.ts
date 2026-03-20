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
        cy.get('[data-testid="chatbot-message-input"]').should('be.enabled').type(`${message}{enter}`);

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
        cy.get('[data-testid="chatbot-message-input"]').should('be.enabled').type(`${message}{enter}`);

        cy.wait('@sendMessage', { timeout: 15000 });
        cy.contains('이 응답은 캐시에서 제공됩니다.', { timeout: 10000 }).should('be.visible');
        cy.contains('빠른 응답').should('be.visible');
    });

    it('should allow cancelling an in-flight chatbot request', () => {
        const message = 'please cancel this request';

        cy.intercept('POST', '**/ai/chat/stream*', (req) => {
            if (String(req.body?.question || '') !== message) {
                req.continue();
                return;
            }

            req.reply({
                delay: 3000,
                statusCode: 200,
                headers: {
                    'content-type': 'text/event-stream'
                },
                body: [
                    'event: message',
                    'data: {"delta": "이 응답은 도착하면 안 됩니다."}',
                    '',
                    'event: done',
                    'data: [DONE]',
                    '',
                ].join('\n'),
            });
        }).as('cancelledMessage');

        cy.get('button[aria-label="챗봇 열기"]').should('exist').click();
        cy.get('[data-testid="chatbot-message-input"]').should('be.enabled').type(`${message}{enter}`);
        cy.get('[data-testid="chatbot-cancel-button"]', { timeout: 10000 }).should('be.visible').click();

        cy.contains('응답을 취소했습니다.', { timeout: 10000 }).should('be.visible');
        cy.contains('응답 취소됨').should('be.visible');
        cy.contains('이 응답은 도착하면 안 됩니다.').should('not.exist');
    });

    it('should cancel the in-flight response when closing the panel', () => {
        const message = 'please close this request';
        const staleResponse = '이 응답은 닫은 뒤 도착하면 안 됩니다.';

        cy.intercept('POST', '**/ai/chat/stream*', (req) => {
            if (String(req.body?.question || '') !== message) {
                req.continue();
                return;
            }

            req.reply({
                delay: 3000,
                statusCode: 200,
                headers: {
                    'content-type': 'text/event-stream'
                },
                body: [
                    'event: message',
                    `data: {"delta": "${staleResponse}"}`,
                    '',
                    'event: done',
                    'data: [DONE]',
                    '',
                ].join('\n'),
            });
        }).as('closeCancelledMessage');

        cy.get('button[aria-label="챗봇 열기"]').should('exist').click();
        cy.get('[data-testid="chatbot-message-input"]').should('be.enabled').type(`${message}{enter}`);
        cy.get('[data-testid="chatbot-cancel-button"]', { timeout: 10000 }).should('be.visible');
        cy.get('button[aria-label="챗봇 닫기"]').click();
        cy.contains('야구 가이드 BEGA').should('not.exist');

        cy.wait(3500);

        cy.get('button[aria-label="챗봇 열기"]').should('exist').click();
        cy.contains('응답을 취소했습니다.', { timeout: 10000 }).should('be.visible');
        cy.contains('응답 취소됨').should('be.visible');
        cy.contains(staleResponse).should('not.exist');
        cy.contains('응답 중 오류가 발생했습니다.').should('not.exist');
    });

    it('should cancel the previous response when a new message supersedes it', () => {
        const firstMessage = 'please replace first request';
        const secondMessage = 'second request should win';
        const staleFirstResponse = '첫 번째 응답은 취소되어야 합니다.';
        const secondResponse = '두 번째 응답이 최종으로 보여야 합니다.';

        cy.intercept('POST', '**/ai/chat/stream*', (req) => {
            const question = String(req.body?.question || '');

            if (question === firstMessage) {
                req.reply({
                    delay: 3000,
                    statusCode: 200,
                    headers: {
                        'content-type': 'text/event-stream'
                    },
                    body: [
                        'event: message',
                        `data: {"delta": "${staleFirstResponse}"}`,
                        '',
                        'event: done',
                        'data: [DONE]',
                        '',
                    ].join('\n'),
                });
                return;
            }

            if (question === secondMessage) {
                req.reply({
                    statusCode: 200,
                    headers: {
                        'content-type': 'text/event-stream'
                    },
                    body: [
                        'event: message',
                        `data: {"delta": "${secondResponse}"}`,
                        '',
                        'event: meta',
                        'data: {"verified": true, "cached": false, "intent": "freeform", "data_sources": [], "tool_calls": []}',
                        '',
                        'event: done',
                        'data: [DONE]',
                        '',
                    ].join('\n'),
                });
                return;
            }

            req.continue();
        }).as('supersededMessages');

        cy.get('button[aria-label="챗봇 열기"]').should('exist').click();
        cy.get('[data-testid="chatbot-message-input"]').should('be.enabled').type(`${firstMessage}{enter}`);
        cy.get('[data-testid="chatbot-cancel-button"]', { timeout: 10000 }).should('be.visible');
        cy.get('[data-testid="chatbot-message-input"]').should('be.enabled').type(secondMessage);
        cy.get('[data-testid="chatbot-send-button"]').should('be.enabled').click();

        cy.contains(firstMessage).should('be.visible');
        cy.contains(secondMessage).should('be.visible');
        cy.contains(secondResponse, { timeout: 10000 }).should('be.visible');
        cy.get('[aria-label="대화 내용"]')
            .invoke('text')
            .should('include', '응답 취소됨');

        cy.wait(3500);

        cy.contains(staleFirstResponse).should('not.exist');
        cy.contains('응답 중 오류가 발생했습니다.').should('not.exist');
    });

    it('should close the chat panel', () => {
        cy.get('button[aria-label="챗봇 열기"]').click();
        cy.get('button[aria-label="챗봇 닫기"]').should('be.visible').click();
        cy.contains('야구 가이드 BEGA').should('not.exist');
    });
});
