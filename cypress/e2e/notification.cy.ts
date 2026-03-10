/// <reference types="cypress" />

describe('Notification Panel', () => {
    const createNotifications = () => ({
        notifications: [
            {
                id: 1,
                type: 'APPLICATION_RECEIVED',
                title: '파티 신청 접수',
                message: '새 신청이 도착했습니다.',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: null,
            },
            {
                id: 2,
                type: 'NEW_FOLLOWER',
                title: '새 팔로워',
                message: 'testuser2님이 팔로우했습니다.',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: null,
            },
            {
                id: 3,
                type: 'POST_LIKE',
                title: '게시글 좋아요',
                message: 'testuser3님이 좋아요를 눌렀습니다.',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: null,
            },
        ],
    });

    const createNotificationFixture = () => ([
        {
            id: 1,
            type: 'APPLICATION_RECEIVED',
            title: '파티 신청 접수',
            message: '새 신청이 도착했습니다.',
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedId: null,
        },
        {
            id: 2,
            type: 'NEW_FOLLOWER',
            title: '새 팔로워',
            message: 'testuser2님이 팔로우했습니다.',
            isRead: true,
            createdAt: new Date().toISOString(),
            relatedId: null,
        },
    ]);

    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();
    });

    it('shows unread badge count on bell icon', () => {
        const { notifications } = createNotifications();
        const unreadCount = notifications.reduce((count, item) => (item.isRead ? count : count + 1), 0);

        cy.intercept('GET', '**/api/notifications/my', {
            statusCode: 200,
            body: notifications,
        }).as('getNotifications');
        cy.intercept('GET', '**/api/notifications/my/unread-count', {
            statusCode: 200,
            body: unreadCount,
        }).as('getUnreadCount');

        cy.visit('/home');
        cy.get('button[aria-label^="알림"]').click();
        cy.wait('@getNotifications');
        cy.get('button[aria-label^="알림"]').find('span').contains(`${unreadCount}`).should('be.visible');
    });

    it('opens notification panel and renders notification list', () => {
        const notifications = createNotificationFixture();
        const unreadCount = notifications.reduce((count, item) => (item.isRead ? count : count + 1), 0);

        cy.intercept('GET', '**/api/notifications/my', {
            statusCode: 200,
            body: notifications,
        }).as('getNotifications');
        cy.intercept('GET', '**/api/notifications/my/unread-count', {
            statusCode: 200,
            body: unreadCount,
        }).as('getUnreadCount');

        cy.visit('/home');
        cy.get('button[aria-label^="알림"]').click();
        cy.wait('@getNotifications');

        cy.contains('파티 신청 접수').should('be.visible');
        cy.contains('새 팔로워').should('be.visible');
    });

    it('shows empty state when there are no notifications', () => {
        const notifications: Array<{
            id: number;
            type: string;
            title: string;
            message: string;
            isRead: boolean;
            createdAt: string;
            relatedId: number | null;
        }> = [];
        const unreadCount = notifications.reduce((count, item) => (item.isRead ? count : count + 1), 0);

        cy.intercept('GET', '**/api/notifications/my', {
            statusCode: 200,
            body: notifications,
        }).as('getNotifications');
        cy.intercept('GET', '**/api/notifications/my/unread-count', {
            statusCode: 200,
            body: unreadCount,
        }).as('getUnreadCount');

        cy.visit('/home');
        cy.get('button[aria-label^="알림"]').click();
        cy.wait('@getNotifications');

        cy.contains(/알림이 없|새로운 알림|no notification/i).should('be.visible');
    });

    it('marks all notifications as read when clicking the button', () => {
        const notifications = [
            {
                id: 1,
                type: 'APPLICATION_RECEIVED',
                title: '파티 신청 접수',
                message: '새 신청이 도착했습니다.',
                isRead: false,
                createdAt: new Date().toISOString(),
                relatedId: null,
            },
        ];
        const unreadCount = notifications.reduce((count, item) => (item.isRead ? count : count + 1), 0);

        cy.intercept('GET', '**/api/notifications/my', {
            statusCode: 200,
            body: notifications,
        }).as('getNotifications');
        cy.intercept('GET', '**/api/notifications/my/unread-count', {
            statusCode: 200,
            body: unreadCount,
        }).as('getUnreadCount');

        cy.intercept('POST', '**/api/notifications/*/read', {
            statusCode: 200,
            body: { success: true },
        }).as('readOne');

        cy.visit('/home');
        cy.get('button[aria-label^="알림"]').click();
        cy.wait('@getNotifications');

        cy.contains(/모두 읽음|전체 읽음|모두 읽기|전체 확인/i).click();
        cy.wait('@readOne');
    });
});
