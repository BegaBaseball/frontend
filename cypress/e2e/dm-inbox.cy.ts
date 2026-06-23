/// <reference types="cypress" />

describe('DM Inbox', () => {
    const targetUser = {
        id: 456,
        name: 'OtherUser',
        handle: '@otheruser',
        favoriteTeam: 'LG',
        profileImageUrl: null,
    };

    const mockRoom = {
        roomId: 901,
        targetUser,
        lastMessage: {
            content: '안녕하세요!',
            createdAt: new Date().toISOString(),
            senderId: 456,
        },
        hasUnread: false,
    };

    const mockRoomWithUnread = {
        ...mockRoom,
        hasUnread: true,
    };

    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();
    });

    it('shows empty state when there are no conversations', () => {
        cy.intercept('GET', '**/api/dm/rooms/my', {
            statusCode: 200,
            body: { success: true, data: [] },
        }).as('getDmInbox');

        cy.visit('/messages');
        cy.wait('@getDmInbox');

        cy.get('[data-testid="dm-inbox-title"]').should('be.visible');
        cy.contains('아직 대화가 없습니다').should('be.visible');
        cy.contains('팔로우한 사용자의 프로필에서 메시지를 보내보세요').should('be.visible');
    });

    it('renders conversation list when rooms exist', () => {
        cy.intercept('GET', '**/api/dm/rooms/my', {
            statusCode: 200,
            body: { success: true, data: [mockRoom] },
        }).as('getDmInbox');

        cy.visit('/messages');
        cy.wait('@getDmInbox');

        cy.get('[data-testid="dm-inbox-list"]').should('be.visible');
        cy.get('[data-testid="dm-inbox-room-row"]').should('have.length', 1);
        cy.contains('OtherUser').should('be.visible');
        cy.contains('안녕하세요!').should('be.visible');
    });

    it('navigates to conversation when clicking a room', () => {
        cy.intercept('GET', '**/api/dm/rooms/my', {
            statusCode: 200,
            body: { success: true, data: [mockRoom] },
        }).as('getDmInbox');

        cy.intercept('POST', '**/api/dm/rooms', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    roomId: 901,
                    membershipState: 'ACTIVE',
                    targetUser,
                },
            },
        }).as('bootstrapRoom');

        cy.intercept('GET', '**/api/dm/rooms/901/messages', {
            statusCode: 200,
            body: { success: true, data: [] },
        }).as('getMessages');

        cy.visit('/messages');
        cy.wait('@getDmInbox');

        cy.get('[data-testid="dm-inbox-room-row"]').first().click();
        cy.url().should('include', '/messages/@otheruser');
    });

    it('shows unread badge dot on rooms with unread messages', () => {
        cy.intercept('GET', '**/api/dm/rooms/my', {
            statusCode: 200,
            body: { success: true, data: [mockRoomWithUnread] },
        }).as('getDmInbox');

        cy.visit('/messages');
        cy.wait('@getDmInbox');

        cy.get('[data-testid="dm-inbox-room-row"]').first().within(() => {
            // unread dot is visible (red circle on avatar)
            cy.get('.bg-red-500').should('exist');
        });
    });

    it('navigates to /messages when clicking Navbar DM icon', () => {
        cy.intercept('GET', '**/api/dm/rooms/my', {
            statusCode: 200,
            body: { success: true, data: [mockRoom] },
        }).as('getDmInbox');

        cy.intercept('GET', '**/api/auth/mypage*', {
            statusCode: 200,
            body: { success: true, data: { id: 123, email: 'test@example.com', name: 'TestUser', handle: 'testuser', favoriteTeam: 'HH', role: 'ROLE_USER', hasPassword: true, profileImageUrl: null } },
        });

        cy.visit('/mypage');
        cy.wait('@getDmInbox');

        // Navbar re-renders when its own ['dm','inbox'] query resolves, which can
        // detach the icon mid-click. Assert visibility first, then issue click as a
        // separate command so Cypress re-queries a fresh (attached) element.
        cy.get('[data-testid="navbar-dm-icon"]', { timeout: 10000 }).should('be.visible');
        cy.get('[data-testid="navbar-dm-icon"]').click();

        cy.url().should('include', '/messages');
    });

    it('shows DM unread badge on Navbar icon when there are unread rooms', () => {
        cy.intercept('GET', '**/api/dm/rooms/my', {
            statusCode: 200,
            body: { success: true, data: [mockRoomWithUnread] },
        }).as('getDmInboxUnread');

        cy.intercept('GET', '**/api/auth/mypage*', {
            statusCode: 200,
            body: { success: true, data: { id: 123, email: 'test@example.com', name: 'TestUser', handle: 'testuser', favoriteTeam: 'HH', role: 'ROLE_USER', hasPassword: true, profileImageUrl: null } },
        });

        cy.visit('/mypage');
        cy.wait('@getDmInboxUnread');

        cy.get('[data-testid="navbar-dm-icon"]', { timeout: 10000 }).within(() => {
            cy.contains('1').should('exist');
        });
    });
});
