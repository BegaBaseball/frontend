/// <reference types="cypress" />

export {};

const greetingText = '안녕하세요! 야구 가이드 BEGA입니다. 무엇을 도와드릴까요?';

const defaultMeta = {
    verified: true,
    cached: false,
    intent: 'freeform',
    data_sources: [],
    tool_calls: [],
    style: 'markdown',
};

const authToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiVGVzdFVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.chatbot-test-token';

const authenticatedUser = {
    id: 123,
    email: 'test@example.com',
    name: 'TestUser',
    handle: 'testuser',
    favoriteTeam: 'HH',
    role: 'ROLE_USER',
    hasPassword: true,
    profileImageUrl: null,
};

type SessionRecord = {
    sessionId: number;
    title: string;
    messageCount: number;
    latestMessagePreview: string | null;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
};

type StoredChatMessageRecord = {
    messageId: number;
    sessionId: number;
    role: 'USER' | 'ASSISTANT';
    status: 'COMPLETED' | 'CANCELLED' | 'ERROR';
    content: string;
    cancelled: boolean;
    favorite: boolean;
    createdAt: string;
    updatedAt: string;
    verified?: boolean | null;
    cached?: boolean | null;
    intent?: string | null;
    strategy?: string | null;
    finishReason?: string | null;
    errorCode?: string | null;
    plannerMode?: string | null;
    plannerCacheHit?: boolean | null;
    toolExecutionMode?: string | null;
    fallbackReason?: string | null;
    metadata?: Record<string, unknown> | null;
    citations?: Array<{ title?: string; url?: string; content?: string }> | null;
    toolCalls?: Array<{ tool_name?: string; toolName?: string; parameters?: Record<string, unknown> }> | null;
};

type FavoriteRecord = {
    messageId: number;
    sessionId: number;
    sessionTitle: string;
    content: string;
    prompt?: string | null;
    favoritedAt: string;
    messageCreatedAt: string;
};

let sessions: SessionRecord[];
let favorites: FavoriteRecord[];
let messagesBySession: Record<number, StoredChatMessageRecord[]>;
let nextSessionId: number;
let nextMessageId: number;
let timestampCursor: number;

const chatSessionsPattern = /\/ai\/chat\/sessions(?:\?.*)?$/;
const chatSessionDeletePattern = /\/ai\/chat\/sessions\/\d+(?:\?.*)?$/;
const chatSessionMessagesPattern = /\/ai\/chat\/sessions\/\d+\/messages(?:\?.*)?$/;
const chatSessionUserMessagePattern = /\/ai\/chat\/sessions\/\d+\/messages\/user(?:\?.*)?$/;
const chatSessionAssistantMessagePattern = /\/ai\/chat\/sessions\/\d+\/messages\/assistant(?:\?.*)?$/;
const chatFavoritesPattern = /\/ai\/chat\/favorites(?:\?.*)?$/;
const chatFavoriteMutationPattern = /\/ai\/chat\/favorites\/\d+(?:\?.*)?$/;

const findStoredMessage = (messageId: number): StoredChatMessageRecord | null => {
    for (const sessionMessages of Object.values(messagesBySession)) {
        const match = sessionMessages.find((message) => (
            message.messageId === messageId && message.role === 'ASSISTANT'
        ));
        if (match) {
            return match;
        }
    }

    return null;
};

const findPreviousUserPrompt = (sessionId: number, messageId: number): string | null => {
    const sessionMessages = messagesBySession[sessionId] || [];
    const messageIndex = sessionMessages.findIndex((message) => message.messageId === messageId);

    if (messageIndex <= 0) {
        return null;
    }

    for (let index = messageIndex - 1; index >= 0; index -= 1) {
        const candidate = sessionMessages[index];
        if (candidate.role === 'USER') {
            return candidate.content;
        }
    }

    return null;
};

const setStoredMessageFavorite = (messageId: number, favorite: boolean) => {
    messagesBySession = Object.fromEntries(
        Object.entries(messagesBySession).map(([sessionId, sessionMessages]) => [
            sessionId,
            sessionMessages.map((message) => (
                message.messageId === messageId
                    ? { ...message, favorite }
                    : message
            )),
        ]),
    );
};

const buildSseBody = ({
    delta,
    meta = defaultMeta,
    error,
    done = true,
}: {
    delta?: string;
    meta?: Record<string, unknown> | null;
    error?: Record<string, unknown> | null;
    done?: boolean;
}) => {
    const chunks: string[] = [];

    if (delta) {
        chunks.push('event: message');
        chunks.push(`data: ${JSON.stringify({ delta })}`);
        chunks.push('');
    }

    if (error) {
        chunks.push('event: error');
        chunks.push(`data: ${JSON.stringify(error)}`);
        chunks.push('');
    }

    if (meta) {
        chunks.push('event: meta');
        chunks.push(`data: ${JSON.stringify(meta)}`);
        chunks.push('');
    }

    if (done) {
        chunks.push('event: done');
        chunks.push('data: [DONE]');
        chunks.push('');
    }

    return chunks.join('\n');
};

const openChatbot = () => {
    cy.get('button[aria-label="챗봇 열기"]').should('exist').click();
    cy.contains('야구 가이드 BEGA').should('exist');
};

const openChatbotAndWaitForGreeting = () => {
    openChatbot();
    cy.get('[data-testid="chatbot-tab-conversation"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="chatbot-message-input"]', { timeout: 10000 }).should('be.visible');
    cy.contains(greetingText, { timeout: 15000 }).should('be.visible');
};

const nextTimestamp = () => {
    timestampCursor += 1;
    return new Date(Date.UTC(2026, 2, 22, 12, 0, timestampCursor)).toISOString();
};

const upsertSessionSummary = (sessionId: number) => {
    const existingMessages = messagesBySession[sessionId] || [];
    const latestMessage = existingMessages[existingMessages.length - 1];
    const fallbackTimestamp = nextTimestamp();
    const existingSummary = sessions.find((session) => session.sessionId === sessionId);
    const firstUserMessage = existingMessages.find((message) => message.role === 'USER')?.content;
    const resolvedTitle = existingSummary?.title === '새 대화' && (existingSummary?.messageCount ?? 0) === 0 && firstUserMessage
        ? firstUserMessage
        : existingSummary?.title || firstUserMessage || '새 대화';

    const summary: SessionRecord = {
        sessionId,
        title: resolvedTitle,
        messageCount: existingMessages.length,
        latestMessagePreview: latestMessage?.content || null,
        createdAt: existingSummary?.createdAt || fallbackTimestamp,
        updatedAt: latestMessage?.updatedAt || existingSummary?.updatedAt || fallbackTimestamp,
        lastMessageAt: latestMessage?.createdAt || existingSummary?.lastMessageAt || fallbackTimestamp,
    };

    sessions = [
        summary,
        ...sessions.filter((session) => session.sessionId !== sessionId),
    ];
};

const registerChatPersistenceMocks = () => {
    cy.intercept('GET', chatSessionsPattern, (req) => {
        req.reply({
            statusCode: 200,
            body: {
                success: true,
                data: sessions,
            },
        });
    }).as('getChatSessions');

    cy.intercept('POST', chatSessionsPattern, (req) => {
        const createdAt = nextTimestamp();
        const session: SessionRecord = {
            sessionId: nextSessionId,
            title: '새 대화',
            messageCount: 0,
            latestMessagePreview: null,
            createdAt,
            updatedAt: createdAt,
            lastMessageAt: createdAt,
        };

        messagesBySession[nextSessionId] = [];
        sessions = [session, ...sessions];
        nextSessionId += 1;

        req.reply({
            statusCode: 200,
            body: {
                success: true,
                data: session,
            },
        });
    }).as('createChatSession');

    cy.intercept('DELETE', chatSessionDeletePattern, (req) => {
        const sessionId = Number(req.url.split('/').pop());

        sessions = sessions.filter((session) => session.sessionId !== sessionId);
        favorites = favorites.filter((favorite) => favorite.sessionId !== sessionId);
        delete messagesBySession[sessionId];

        req.reply({
            statusCode: 200,
            body: {
                success: true,
            },
        });
    }).as('deleteChatSession');

    cy.intercept('GET', chatSessionMessagesPattern, (req) => {
        const sessionId = Number(req.url.split('/').slice(-2)[0]);
        req.reply({
            statusCode: 200,
            body: {
                success: true,
                data: messagesBySession[sessionId] || [],
            },
        });
    }).as('getChatMessages');

    cy.intercept('POST', chatSessionUserMessagePattern, (req) => {
        const sessionId = Number(req.url.split('/').slice(-3)[0]);
        const timestamp = nextTimestamp();
        const content = String(req.body?.content || '');
        const storedMessage: StoredChatMessageRecord = {
            messageId: nextMessageId,
            sessionId,
            role: 'USER',
            status: 'COMPLETED',
            content,
            cancelled: false,
            favorite: false,
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        messagesBySession[sessionId] = [...(messagesBySession[sessionId] || []), storedMessage];
        upsertSessionSummary(sessionId);
        nextMessageId += 1;

        req.reply({
            statusCode: 200,
            body: {
                success: true,
                data: storedMessage,
            },
        });
    }).as('saveUserChatMessage');

    cy.intercept('POST', chatSessionAssistantMessagePattern, (req) => {
        const sessionId = Number(req.url.split('/').slice(-3)[0]);
        const timestamp = nextTimestamp();
        const content = String(req.body?.content || '');
        const storedMessage: StoredChatMessageRecord = {
            messageId: nextMessageId,
            sessionId,
            role: 'ASSISTANT',
            status: (req.body?.status as StoredChatMessageRecord['status']) || 'COMPLETED',
            content,
            cancelled: Boolean(req.body?.cancelled),
            favorite: false,
            createdAt: timestamp,
            updatedAt: timestamp,
            verified: req.body?.verified ?? null,
            cached: req.body?.cached ?? null,
            intent: req.body?.intent ?? null,
            strategy: req.body?.strategy ?? null,
            finishReason: req.body?.finishReason ?? null,
            errorCode: req.body?.errorCode ?? null,
            plannerMode: req.body?.plannerMode ?? null,
            plannerCacheHit: req.body?.plannerCacheHit ?? null,
            toolExecutionMode: req.body?.toolExecutionMode ?? null,
            fallbackReason: req.body?.fallbackReason ?? null,
            metadata: req.body?.metadata ?? null,
            citations: req.body?.citations ?? [],
            toolCalls: req.body?.toolCalls ?? [],
        };

        messagesBySession[sessionId] = [...(messagesBySession[sessionId] || []), storedMessage];
        upsertSessionSummary(sessionId);
        nextMessageId += 1;

        req.reply({
            statusCode: 200,
            body: {
                success: true,
                data: storedMessage,
            },
        });
    }).as('saveAssistantChatMessage');

    cy.intercept('GET', chatFavoritesPattern, (req) => {
        req.reply({
            statusCode: 200,
            body: {
                success: true,
                data: favorites,
            },
        });
    }).as('getChatFavorites');

    cy.intercept('POST', chatFavoriteMutationPattern, (req) => {
        const messageId = Number(req.url.split('/').pop());
        const storedMessage = findStoredMessage(messageId);

        if (!storedMessage) {
            req.reply({
                statusCode: 404,
                body: {
                    success: false,
                },
            });
            return;
        }

        const session = sessions.find((item) => item.sessionId === storedMessage.sessionId);
        const favorite: FavoriteRecord = {
            messageId,
            sessionId: storedMessage.sessionId,
            sessionTitle: session?.title || '새 대화',
            content: storedMessage.content,
            prompt: findPreviousUserPrompt(storedMessage.sessionId, messageId),
            favoritedAt: nextTimestamp(),
            messageCreatedAt: storedMessage.createdAt,
        };

        setStoredMessageFavorite(messageId, true);
        favorites = [favorite, ...favorites.filter((item) => item.messageId !== messageId)];

        req.reply({
            statusCode: 200,
            body: {
                success: true,
                data: favorite,
            },
        });
    }).as('addChatFavorite');

    cy.intercept('DELETE', chatFavoriteMutationPattern, (req) => {
        const messageId = Number(req.url.split('/').pop());

        setStoredMessageFavorite(messageId, false);
        favorites = favorites.filter((favorite) => favorite.messageId !== messageId);

        req.reply({
            statusCode: 200,
            body: {
                success: true,
            },
        });
    }).as('deleteChatFavorite');
};

const seedAuthenticatedWindow = (win: Window, allowSessionExpiry = false) => {
    const originalAddEventListener = win.addEventListener.bind(win);
    win.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
        if (type === 'global-api-error' || (!allowSessionExpiry && type === 'auth-session-expired')) {
            return;
        }
        return originalAddEventListener(type, listener, options);
    }) as typeof win.addEventListener;

    win.sessionStorage.clear();
    win.localStorage.removeItem('auth-storage');
    win.localStorage.setItem('auth-storage', JSON.stringify({
        state: {
            user: authenticatedUser,
            isLoggedIn: true,
            isAdmin: false,
        },
        version: 0,
    }));
    win.localStorage.setItem('accessToken', authToken);
    win.localStorage.setItem('auth-bootstrap-hint', '1');
    win.localStorage.setItem('bega_has_visited', 'true');
    win.localStorage.setItem('bega_dont_show_guide', 'true');
};

const visitLoggedInShell = (allowSessionExpiry = false) => {
    cy.mockAPI();
    registerChatPersistenceMocks();

    cy.intercept('GET', '**/auth/mypage*', {
        statusCode: 200,
        body: {
            success: true,
            data: authenticatedUser,
        },
    }).as('getMeAuthenticated');

    cy.intercept('GET', '**/api/chat/my/unread-counts', {
        statusCode: 200,
        body: { success: true, data: 0 },
    }).as('getUnreadChatCounts');

    cy.intercept('GET', '**/api/notifications/my/unread-count', {
        statusCode: 200,
        body: 0,
    }).as('getUnreadNotificationCount');

    cy.intercept('GET', '**/api/notifications/my*', {
        statusCode: 200,
        body: [],
    }).as('getNotifications');

    cy.intercept('POST', '**/ai/chat/stream*', (req) => {
        const question = String(req.body?.question || '');
        const isCachedScenario = question.toLowerCase().includes('cached');

        req.reply({
            statusCode: 200,
            headers: {
                'content-type': 'text/event-stream',
            },
            body: isCachedScenario
                ? buildSseBody({
                    delta: '이 응답은 캐시에서 제공됩니다.',
                    meta: {
                        ...defaultMeta,
                        cached: true,
                        intent: 'stats_lookup',
                    },
                })
                : buildSseBody({
                    delta: 'Hello! I am the KBO AI Assistant.',
                }),
        });
    }).as('sendMessage');

    cy.visit('/mypage', {
        onBeforeLoad(win) {
            seedAuthenticatedWindow(win, allowSessionExpiry);
        },
    });
    cy.window().then((win) => {
        seedAuthenticatedWindow(win, allowSessionExpiry);
    });
    cy.setCookie('Authorization', authToken);
    cy.wait('@getMeAuthenticated');
    cy.get('button[aria-label="챗봇 열기"]', { timeout: 20000 }).should('be.visible');
    cy.get('[role="alertdialog"], [role="dialog"]').should('not.exist');
};

const typeAndSend = (message: string, expectsNewSession = false) => {
    cy.getBySel('chatbot-message-input').should('be.enabled').clear().type(message);
    cy.getBySel('chatbot-message-input').closest('form').submit();
    if (expectsNewSession) {
        cy.wait('@createChatSession', { timeout: 10000 });
    }
    cy.wait('@saveUserChatMessage', { timeout: 10000 });
    cy.contains(message, { timeout: 10000 }).should('exist');
};

const selectVisibleText = (selector: string, value: string) => {
    cy.get(selector).filter(':visible').contains(value).click({ force: true });
};

const visibleSessionDialog = () => cy.get('[role="alertdialog"], [role="dialog"]').filter(':visible').last();

const openConversationTab = () => {
    cy.getBySel('chatbot-tab-conversation').click();
};

const openHistoryTab = () => {
    cy.getBySel('chatbot-tab-history').click();
};

const openFavoritesTab = () => {
    cy.getBySel('chatbot-tab-favorites').click();
};

describe('AI Chatbot', () => {
    beforeEach(() => {
        sessions = [];
        favorites = [];
        messagesBySession = {};
        nextSessionId = 1000;
        nextMessageId = 5000;
        timestampCursor = 0;
    });

    describe('Guest gating', () => {
        beforeEach(() => {
            visitLoggedInShell(true);
        });

        it('shows login recovery UI and routes to login after session expiry', () => {
            openChatbot();

            cy.window().then((win) => {
                win.dispatchEvent(new Event('auth-session-expired'));
            });

            visibleSessionDialog().should('exist');
            cy.contains('로그인 필요', { timeout: 10000 }).should('exist');
            cy.contains('로그인이 필요한 서비스입니다.', { timeout: 10000 }).should('exist');
            cy.contains('button', '로그인하러 가기', { timeout: 10000 }).click({ force: true });

            cy.location('pathname', { timeout: 10000 }).should('eq', '/login');
            cy.location('search').should('include', 'redirect=%2Fmypage');
        });
    });

    describe('Authenticated flows', () => {
        beforeEach(() => {
            visitLoggedInShell();
        });

        it('opens the panel and sends a message', () => {
            const message = 'Who is the best player?';

            openChatbotAndWaitForGreeting();
            typeAndSend(message, true);

            cy.wait('@sendMessage', { timeout: 15000 });
            cy.contains('Hello! I am the KBO AI Assistant.', { timeout: 10000 }).should('be.visible');
        });

        it('shows fast response badges for cached replies', () => {
            const message = 'please send cached response';

            openChatbotAndWaitForGreeting();
            typeAndSend(message);

            cy.wait('@sendMessage', { timeout: 15000 });
            cy.contains('이 응답은 캐시에서 제공됩니다.', { timeout: 10000 }).should('be.visible');
            cy.contains('빠른 응답').should('be.visible');
        });

        it('persists messages after closing and reopening the panel', () => {
            const message = '이 대화는 다시 열어도 남아 있어야 합니다.';
            const reply = '대화 내역은 세션 스토리지에 유지됩니다.';

            cy.intercept('POST', '**/ai/chat/stream*', {
                statusCode: 200,
                headers: {
                    'content-type': 'text/event-stream',
                },
                body: buildSseBody({ delta: reply }),
            }).as('persistedMessage');

            openChatbotAndWaitForGreeting();
            typeAndSend(message);

            cy.wait('@persistedMessage');
            cy.contains(reply, { timeout: 10000 }).should('be.visible');

            cy.get('button[aria-label="챗봇 닫기"]').click();
            cy.contains('야구 가이드 BEGA').should('not.exist');

            openChatbot();
            cy.contains(message).should('be.visible');
            cy.contains(reply).should('be.visible');
        });

        it('restores the active session after a page reload', () => {
            const firstQuestion = '첫 번째 세션 질문입니다.';
            const secondQuestion = '두 번째 세션 질문입니다.';
            const firstReply = '첫 번째 세션 답변입니다.';
            const secondReply = '두 번째 세션 답변입니다.';

            cy.intercept('POST', '**/ai/chat/stream*', (req) => {
                const question = String(req.body?.question || '');

                if (question === firstQuestion) {
                    req.reply({
                        statusCode: 200,
                        headers: {
                            'content-type': 'text/event-stream',
                        },
                        body: buildSseBody({ delta: firstReply }),
                    });
                    return;
                }

                if (question === secondQuestion) {
                    req.reply({
                        statusCode: 200,
                        headers: {
                            'content-type': 'text/event-stream',
                        },
                        body: buildSseBody({ delta: secondReply }),
                    });
                    return;
                }

                req.continue();
            }).as('sessionReloadStream');

            openChatbotAndWaitForGreeting();
            typeAndSend(firstQuestion);
            cy.wait('@sessionReloadStream');
            cy.wait('@saveAssistantChatMessage');
            cy.contains(firstReply, { timeout: 10000 }).should('be.visible');

            openHistoryTab();
            cy.getBySel('chatbot-history-new-session').click();
            cy.getBySel('chatbot-session-title').should('contain', '새 대화');

            typeAndSend(secondQuestion);
            cy.wait('@sessionReloadStream');
            cy.wait('@saveAssistantChatMessage');
            cy.contains(secondReply, { timeout: 10000 }).should('be.visible');
            cy.getBySel('chatbot-session-title').should('contain', secondQuestion);
            cy.get('[aria-label="대화 내용"]').invoke('text').should('include', secondReply);

            cy.visit('/mypage', {
                onBeforeLoad(win) {
                    seedAuthenticatedWindow(win);
                },
            });
            cy.window().then((win) => {
                seedAuthenticatedWindow(win);
            });
            cy.setCookie('Authorization', authToken);
            cy.wait('@getMeAuthenticated');
            cy.wait('@getChatSessions');
            cy.wait('@getChatFavorites');

            openChatbot();
            cy.get('[aria-label="대화 내용"]').invoke('text')
                .should('include', secondQuestion)
                .and('include', secondReply)
                .and('not.include', firstQuestion);
        });

        it('switches between saved sessions from history and deletes the active session', () => {
            const firstQuestion = '한화 선발투수 알려줘';
            const secondQuestion = 'LG 최근 경기 흐름 알려줘';
            const firstReply = '첫 번째 세션 응답입니다.';
            const secondReply = '두 번째 세션 응답입니다.';

            cy.intercept('POST', '**/ai/chat/stream*', (req) => {
                const question = String(req.body?.question || '');

                if (question === firstQuestion) {
                    req.reply({
                        statusCode: 200,
                        headers: {
                            'content-type': 'text/event-stream',
                        },
                        body: buildSseBody({ delta: firstReply }),
                    });
                    return;
                }

                if (question === secondQuestion) {
                    req.reply({
                        statusCode: 200,
                        headers: {
                            'content-type': 'text/event-stream',
                        },
                        body: buildSseBody({ delta: secondReply }),
                    });
                    return;
                }

                req.continue();
            }).as('historySessionStream');

            openChatbotAndWaitForGreeting();
            typeAndSend(firstQuestion);
            cy.wait('@historySessionStream');
            cy.contains(firstReply, { timeout: 10000 }).should('be.visible');

            openHistoryTab();
            cy.getBySel('chatbot-history-new-session').click();
            typeAndSend(secondQuestion);
            cy.wait('@historySessionStream');
            cy.contains(secondReply, { timeout: 10000 }).should('be.visible');

            openHistoryTab();
            cy.getBySel('chatbot-history-session').should('have.length', 2);
            cy.get('[data-testid="chatbot-history-session-open"][data-session-id="1000"]').click();
            cy.wait('@getChatMessages');

            cy.getBySel('chatbot-session-title').should('contain', firstQuestion);
            cy.get('[aria-label="대화 내용"]').invoke('text')
                .should('include', firstReply)
                .and('not.include', secondReply);

            openHistoryTab();
            cy.get('[data-testid="chatbot-history-session-delete"][data-session-id="1000"]').click();
            cy.wait('@deleteChatSession');
            cy.wait('@getChatMessages');

            cy.getBySel('chatbot-history-session').should('have.length', 1);
            cy.getBySel('chatbot-session-title').should('contain', secondQuestion);

            openConversationTab();
            cy.get('[aria-label="대화 내용"]').invoke('text')
                .should('include', secondReply)
                .and('not.include', firstReply);
        });

        it('favorites an answer, reuses the saved prompt, reopens the original session, and removes the favorite', () => {
            const firstQuestion = '오늘 KIA 불펜 어때?';
            const secondQuestion = '삼성 다음 경기 일정 알려줘';
            const firstReply = '첫 번째 즐겨찾기 응답입니다.';
            const secondReply = '두 번째 세션 응답입니다.';

            cy.intercept('POST', '**/ai/chat/stream*', (req) => {
                const question = String(req.body?.question || '');

                if (question === firstQuestion) {
                    req.reply({
                        statusCode: 200,
                        headers: {
                            'content-type': 'text/event-stream',
                        },
                        body: buildSseBody({ delta: firstReply }),
                    });
                    return;
                }

                if (question === secondQuestion) {
                    req.reply({
                        statusCode: 200,
                        headers: {
                            'content-type': 'text/event-stream',
                        },
                        body: buildSseBody({ delta: secondReply }),
                    });
                    return;
                }

                req.continue();
            }).as('favoritesFlowStream');

            openChatbotAndWaitForGreeting();
            typeAndSend(firstQuestion);
            cy.wait('@favoritesFlowStream');
            cy.wait('@saveAssistantChatMessage');
            cy.contains(firstReply, { timeout: 10000 }).should('be.visible');

            cy.get('[data-testid="chatbot-message-favorite-toggle"][data-message-server-id]:not([data-message-server-id=""])')
                .should('have.length.at.least', 1)
                .first()
                .click({ force: true });
            cy.wait('@addChatFavorite');

            openFavoritesTab();
            cy.getBySel('chatbot-favorite-card').should('have.length', 1);
            cy.contains(firstReply).should('be.visible');
            cy.contains(`원 질문: ${firstQuestion}`).should('be.visible');

            cy.getBySel('chatbot-favorite-reask').first().click();
            cy.getBySel('chatbot-message-input').should('have.value', firstQuestion);

            openHistoryTab();
            cy.getBySel('chatbot-history-new-session').click();
            typeAndSend(secondQuestion);
            cy.wait('@favoritesFlowStream');
            cy.wait('@saveAssistantChatMessage');
            cy.contains(secondReply, { timeout: 10000 }).should('be.visible');

            openFavoritesTab();
            cy.getBySel('chatbot-favorite-open-session').first().click();
            cy.wait('@getChatMessages');

            cy.getBySel('chatbot-session-title').should('contain', firstQuestion);
            cy.get('[aria-label="대화 내용"]').invoke('text')
                .should('include', firstReply)
                .and('not.include', secondReply);

            cy.get('[data-testid="chatbot-message-favorite-toggle"][data-message-server-id]:not([data-message-server-id=""])')
                .should('have.length.at.least', 1)
                .first()
                .click({ force: true });
            cy.wait('@deleteChatFavorite');

            openFavoritesTab();
            cy.contains('즐겨찾기한 답변이 없습니다.').should('be.visible');
        });

        it('allows cancelling an in-flight chatbot request', () => {
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
                        'content-type': 'text/event-stream',
                    },
                    body: buildSseBody({ delta: '이 응답은 도착하면 안 됩니다.' }),
                });
            }).as('cancelledMessage');

            openChatbotAndWaitForGreeting();
            typeAndSend(message);

            cy.get('[data-testid="chatbot-cancel-button"]', { timeout: 10000 }).should('be.visible').click();
            cy.contains('응답을 취소했습니다.', { timeout: 10000 }).should('be.visible');
            cy.contains('응답 취소됨').should('be.visible');
            cy.contains('이 응답은 도착하면 안 됩니다.').should('not.exist');
        });

        it('cancels the in-flight response when closing the panel', () => {
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
                        'content-type': 'text/event-stream',
                    },
                    body: buildSseBody({ delta: staleResponse }),
                });
            }).as('closeCancelledMessage');

            openChatbotAndWaitForGreeting();
            typeAndSend(message);

            cy.get('[data-testid="chatbot-cancel-button"]', { timeout: 10000 }).should('be.visible');
            cy.get('button[aria-label="챗봇 닫기"]').click();
            cy.contains('야구 가이드 BEGA').should('not.exist');

            cy.wait(3500);

            openChatbot();
            cy.contains('응답을 취소했습니다.', { timeout: 10000 }).should('be.visible');
            cy.contains('응답 취소됨').should('be.visible');
            cy.contains(staleResponse).should('not.exist');
            cy.contains('응답 중 오류가 발생했습니다.').should('not.exist');
        });

        it('cancels the previous response when a new message supersedes it', () => {
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
                            'content-type': 'text/event-stream',
                        },
                        body: buildSseBody({ delta: staleFirstResponse }),
                    });
                    return;
                }

                if (question === secondMessage) {
                    req.reply({
                        statusCode: 200,
                        headers: {
                            'content-type': 'text/event-stream',
                        },
                        body: buildSseBody({ delta: secondResponse }),
                    });
                    return;
                }

                req.continue();
            }).as('supersededMessages');

            openChatbotAndWaitForGreeting();
            typeAndSend(firstMessage);

            cy.get('[data-testid="chatbot-cancel-button"]', { timeout: 10000 }).should('be.visible');
            cy.getBySel('chatbot-message-input').should('be.enabled').type(secondMessage);
            cy.getBySel('chatbot-send-button').should('be.enabled').click();

            cy.contains(firstMessage).should('be.visible');
            cy.contains(secondMessage).should('be.visible');
            cy.contains(secondResponse, { timeout: 10000 }).should('be.visible');
            cy.get('[aria-label="대화 내용"]').invoke('text').should('include', '응답 취소됨');

            cy.wait(3500);

            cy.contains(staleFirstResponse).should('not.exist');
            cy.contains('응답 중 오류가 발생했습니다.').should('not.exist');
        });

        it('locks retries after 429 responses and shows a countdown before retrying', () => {
            const message = 'rate limit this request';
            let attempts = 0;

            cy.intercept('POST', '**/ai/chat/stream*', (req) => {
                if (String(req.body?.question || '') !== message) {
                    req.continue();
                    return;
                }

                attempts += 1;

                if (attempts === 1) {
                    req.reply({
                        statusCode: 429,
                        headers: {
                            'Retry-After': '1',
                        },
                        body: {},
                    });
                    return;
                }

                req.reply({
                    statusCode: 200,
                    headers: {
                        'content-type': 'text/event-stream',
                    },
                    body: buildSseBody({ delta: '재시도 후 정상 응답이 도착했습니다.' }),
                });
            }).as('rateLimitedMessage');

            openChatbotAndWaitForGreeting();

            cy.clock(Date.now(), ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']);
            cy.window().then((win) => {
                cy.stub(win.Math, 'random').returns(0);
            });

            typeAndSend(message);
            cy.wait('@rateLimitedMessage');

            cy.get('[data-testid="chatbot-panel"]').contains('전 경기 실시간 스탯을 집계하고 있습니다.').should('exist');
            cy.get('[data-testid="chatbot-panel"]').contains('11초 후 다시 시도').should('exist');
            cy.get('[data-testid="chatbot-panel"]').contains('button', '메시지 복구').should('exist').and('not.be.disabled');

            cy.tick(1000);
            cy.get('[data-testid="chatbot-panel"]').contains('10초 후 다시 시도').should('exist');

            cy.tick(11000);
            cy.get('[data-testid="chatbot-panel"]')
                .contains('button', /^지금 /)
                .should('not.be.disabled')
                .click({ force: true });

            cy.wait('@rateLimitedMessage');
            cy.contains('재시도 후 정상 응답이 도착했습니다.', { timeout: 10000 }).should('be.visible');
            cy.get('@rateLimitedMessage.all').should('have.length', 2);
        });

        it('shows a safe fallback message after repeated 503 responses', () => {
            const message = 'service unavailable please';

            cy.intercept('POST', '**/ai/chat/stream*', (req) => {
                if (String(req.body?.question || '') !== message) {
                    req.continue();
                    return;
                }

                req.reply({
                    statusCode: 503,
                    body: {},
                });
            }).as('serviceUnavailableRequest');

            openChatbotAndWaitForGreeting();
            cy.clock(Date.now(), ['Date', 'setTimeout', 'clearTimeout']);

            typeAndSend(message);
            cy.wait('@serviceUnavailableRequest');
            cy.tick(1000);
            cy.wait('@serviceUnavailableRequest');
            cy.tick(2000);
            cy.wait('@serviceUnavailableRequest');
            cy.wait('@saveAssistantChatMessage').its('request.body').should((body) => {
                expect(body.status).to.eq('ERROR');
                expect(body.content).to.eq('서비스 점검 중이거나 일시적인 오류입니다.');
                expect(body.errorCode).to.eq('STATUS_503');
            });
            cy.get('[aria-label="대화 내용"]').invoke('text')
                .should('include', '응답 중 오류가 발생했습니다. 다시 시도해주세요.');
            cy.contains('STATUS_503').should('not.exist');
        });

        it('handles SSE error events without exposing internal stream details', () => {
            const message = 'trigger sse event error';

            cy.intercept('POST', '**/ai/chat/stream*', (req) => {
                if (String(req.body?.question || '') !== message) {
                    req.continue();
                    return;
                }

                req.reply({
                    statusCode: 200,
                    headers: {
                        'content-type': 'text/event-stream',
                    },
                    body: buildSseBody({
                        error: {
                            message: 'temporary_generation_issue',
                            detail: '일시적인 생성 오류가 발생했습니다.',
                        },
                        meta: null,
                        done: false,
                    }),
                });
            }).as('streamEventError');

            openChatbotAndWaitForGreeting();
            typeAndSend(message);

            cy.wait('@streamEventError');
            cy.wait('@saveAssistantChatMessage').its('request.body').should((body) => {
                expect(body.status).to.eq('ERROR');
                expect(body.content).to.eq('일시적인 생성 오류가 발생했습니다.');
                expect(body.errorCode).to.eq('temporary_generation_issue');
            });
            cy.get('[aria-label="대화 내용"]').invoke('text')
                .should('include', '응답 중 오류가 발생했습니다. 다시 시도해주세요.');
            cy.contains('temporary_generation_issue').should('not.exist');
        });

        it('marks incomplete streams as errors and keeps the UI stable', () => {
            const message = 'trigger incomplete stream';

            cy.intercept('POST', '**/ai/chat/stream*', (req) => {
                if (String(req.body?.question || '') !== message) {
                    req.continue();
                    return;
                }

                req.reply({
                    statusCode: 200,
                    headers: {
                        'content-type': 'text/event-stream',
                    },
                    body: buildSseBody({
                        delta: '중간 응답까지만 전송합니다.',
                        done: false,
                    }),
                });
            }).as('incompleteStream');

            openChatbotAndWaitForGreeting();
            typeAndSend(message);

            cy.wait('@incompleteStream');
            cy.wait('@saveAssistantChatMessage').its('request.body').should((body) => {
                expect(body.status).to.eq('ERROR');
                expect(body.content).to.eq('응답이 중단되었습니다. 다시 시도해주세요.');
                expect(body.errorCode).to.eq('INCOMPLETE_STREAM');
            });
            cy.get('[aria-label="대화 내용"]').invoke('text')
                .should('include', '응답 중 오류가 발생했습니다. 다시 시도해주세요.');
        });

        it('surfaces timeout errors for streams that never establish a response', () => {
            const message = 'trigger timeout stream';
            let timeoutStreamFetchCount = 0;

            openChatbotAndWaitForGreeting();
            cy.clock(Date.now(), ['Date', 'setTimeout', 'clearTimeout']);

            cy.window().then((win) => {
                const originalFetch = win.fetch.bind(win);

                cy.stub(win, 'fetch').callsFake((input: RequestInfo | URL, init?: RequestInit) => {
                    const url = typeof input === 'string'
                        ? input
                        : input instanceof URL
                            ? input.toString()
                            : input.url;

                    if (url.includes('/ai/chat/stream')) {
                        timeoutStreamFetchCount += 1;
                        const error = new win.Error('timed out');
                        error.name = 'TimeoutError';
                        return Promise.reject(error);
                    }

                    return originalFetch(input, init);
                }).as('timeoutFetch');
            });

            typeAndSend(message);
            cy.wrap(null).should(() => {
                expect(timeoutStreamFetchCount).to.eq(1);
            });
            cy.tick(1000);
            cy.wrap(null).should(() => {
                expect(timeoutStreamFetchCount).to.eq(2);
            });
            cy.tick(2000);
            cy.wrap(null).should(() => {
                expect(timeoutStreamFetchCount).to.eq(3);
            });
            cy.tick(100);

            cy.wait('@saveAssistantChatMessage').its('request.body').should((body) => {
                expect(body.status).to.eq('ERROR');
                expect(body.content).to.eq('응답 시간이 초과되었습니다.');
                expect(body.errorCode).to.eq('STREAM_TIMEOUT');
            });
            cy.get('[aria-label="대화 내용"]').invoke('text')
                .should('include', '응답 중 오류가 발생했습니다. 다시 시도해주세요.');
        });

        it('closes the chat panel', () => {
            openChatbot();
            cy.get('button[aria-label="챗봇 닫기"]').should('be.visible').click();
            cy.contains('야구 가이드 BEGA').should('not.exist');
        });
    });
});
