/// <reference types="cypress" />

describe('Direct Message v1', () => {
    const messageRoute = '/messages/otheruser';

    const bootstrapResponse = {
        roomId: 901,
        membershipState: 'ACTIVE',
        targetUser: {
            id: 456,
            name: 'OtherUser',
            handle: '@otheruser',
            favoriteTeam: 'LG',
            profileImageUrl: null,
        },
    };

    const installDmSocketFactory = (win: Window) => {
        let listener: ((message: unknown) => void) | null = null;

        (win as Window & {
            __begaDmSocketFactory?: unknown;
            __emitBegaDmSocketMessage?: (message: unknown) => void;
        }).__begaDmSocketFactory = ({
            onConnect,
            onMessage,
        }: {
            onConnect: () => void;
            onMessage: (message: unknown) => void;
        }) => {
            listener = onMessage;
            onConnect();
            return () => {
                listener = null;
            };
        };

        (win as Window & {
            __emitBegaDmSocketMessage?: (message: unknown) => void;
        }).__emitBegaDmSocketMessage = (message: unknown) => {
            listener?.(message);
        };
    };

    it('bootstraps the room, renders history, sends a message, and receives realtime updates', () => {
        cy.login('user');
        cy.mockAPI();

        cy.intercept('POST', '**/api/dm/rooms', {
            statusCode: 200,
            body: {
                success: true,
                data: bootstrapResponse,
            },
        }).as('bootstrapDmRoom');
        cy.intercept('GET', '**/api/dm/rooms/901/messages', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    {
                        id: 1,
                        roomId: 901,
                        senderId: 456,
                        content: '이미 생성된 메시지입니다.',
                        clientMessageId: null,
                        createdAt: '2026-04-15T12:00:00.000Z',
                    },
                ],
            },
        }).as('getDmMessages');
        cy.intercept('POST', '**/api/dm/messages', {
            statusCode: 201,
            body: {
                success: true,
                data: {
                    id: 2,
                    roomId: 901,
                    senderId: 123,
                    content: '안녕하세요!',
                    clientMessageId: 'client-msg-1',
                    createdAt: '2026-04-15T12:01:00.000Z',
                },
            },
        }).as('sendDmMessage');

        cy.visit(messageRoute, {
            onBeforeLoad(win) {
                installDmSocketFactory(win);
            },
        });

        cy.wait('@bootstrapDmRoom');
        cy.wait('@getDmMessages');
        cy.contains('OtherUser').should('be.visible');
        cy.contains('이미 생성된 메시지입니다.').should('be.visible');

        cy.get('textarea[placeholder="메시지를 입력하세요"]').type('안녕하세요!');
        cy.contains('button', '메시지 보내기').click();
        cy.wait('@sendDmMessage');
        cy.contains('안녕하세요!').should('be.visible');

        cy.window().then((win) => {
            (win as Window & {
                __emitBegaDmSocketMessage?: (message: unknown) => void;
            }).__emitBegaDmSocketMessage?.({
                id: 3,
                roomId: 901,
                senderId: 456,
                content: '실시간 응답입니다.',
                clientMessageId: null,
                createdAt: '2026-04-15T12:02:00.000Z',
            });
        });

        cy.contains('실시간 응답입니다.').should('be.visible');
    });

    it('shows inline access state when room bootstrap is forbidden', () => {
        cy.login('user');
        cy.mockAPI();

        cy.intercept('POST', '**/api/dm/rooms', {
            statusCode: 403,
            body: {
                success: false,
                code: 'DM_FOLLOW_REQUIRED',
                message: '팔로우한 사용자에게만 메시지를 보낼 수 있습니다.',
            },
        }).as('bootstrapDmRoomForbidden');

        cy.visit(messageRoute);

        cy.wait('@bootstrapDmRoomForbidden');
        cy.contains('메시지 대화방에 접근할 수 없습니다.').should('be.visible');
        cy.contains('팔로우한 사용자에게만 메시지를 보낼 수 있습니다.').should('be.visible');
        cy.contains('button', '프로필로 돌아가기').should('be.visible');
    });

    it('shows delete button on hover for own messages and removes on click', () => {
        cy.login('user');
        cy.mockAPI();

        cy.intercept('POST', '**/api/dm/rooms', {
            statusCode: 200,
            body: { success: true, data: bootstrapResponse },
        }).as('bootstrapDmRoom');
        cy.intercept('GET', '**/api/dm/rooms/901/messages', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    {
                        id: 10,
                        roomId: 901,
                        senderId: 123,
                        content: '삭제할 메시지입니다.',
                        clientMessageId: null,
                        createdAt: '2026-04-15T12:00:00.000Z',
                    },
                ],
            },
        }).as('getDmMessages');
        cy.intercept('DELETE', '**/api/dm/messages/10', {
            statusCode: 200,
            body: { success: true, data: null },
        }).as('deleteMessage');

        cy.visit(messageRoute, {
            onBeforeLoad(win) {
                installDmSocketFactory(win);
            },
        });

        cy.wait('@bootstrapDmRoom');
        cy.wait('@getDmMessages');
        cy.contains('삭제할 메시지입니다.').should('be.visible');

        cy.contains('삭제할 메시지입니다.')
            .closest('.group')
            .trigger('mouseover')
            .find('button[aria-label="메시지 삭제"]')
            .should('exist')
            .click();

        cy.wait('@deleteMessage');
        cy.contains('삭제할 메시지입니다.').should('not.exist');
    });

    it('removes message when WebSocket delete event is received', () => {
        cy.login('user');
        cy.mockAPI();

        cy.intercept('POST', '**/api/dm/rooms', {
            statusCode: 200,
            body: { success: true, data: bootstrapResponse },
        }).as('bootstrapDmRoom');
        cy.intercept('GET', '**/api/dm/rooms/901/messages', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    {
                        id: 20,
                        roomId: 901,
                        senderId: 456,
                        content: '상대방이 보낸 메시지입니다.',
                        clientMessageId: null,
                        createdAt: '2026-04-15T12:00:00.000Z',
                    },
                ],
            },
        }).as('getDmMessages');

        cy.visit(messageRoute, {
            onBeforeLoad(win) {
                installDmSocketFactory(win);
            },
        });

        cy.wait('@bootstrapDmRoom');
        cy.wait('@getDmMessages');
        cy.contains('상대방이 보낸 메시지입니다.').should('be.visible');

        cy.window().then((win) => {
            (win as Window & {
                __emitBegaDmSocketMessage?: (message: unknown) => void;
            }).__emitBegaDmSocketMessage?.({
                messageId: 20,
                roomId: 901,
                deleted: true,
            });
        });

        cy.contains('상대방이 보낸 메시지입니다.').should('not.exist');
    });

    it('keeps guest access behind the existing protected route login dialog', () => {
        cy.intercept('GET', '**/auth/mypage*', {
            statusCode: 401,
            body: {
                success: false,
                message: 'Unauthorized',
            },
        }).as('guestGetMe');

        cy.visit(messageRoute);

        cy.get('[data-testid="prediction-login-required-dialog"]').should('be.visible');
    });
});
