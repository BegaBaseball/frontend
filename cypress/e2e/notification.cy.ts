/// <reference types="cypress" />

describe('Notification Panel', () => {
    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();
    });

    it('shows unread badge count on bell icon', () => {
        cy.intercept('GET', '**/api/notifications/my/unread-count', {
            statusCode: 200,
            body: 3,
        }).as('getUnreadCount');

        cy.visit('/home');
        cy.wait('@getUnreadCount');

        cy.get('button[aria-label^="알림"]').should('be.visible').within(() => {
            cy.contains('3').should('be.visible');
        });
    });

    it('opens notification panel and renders notification list', () => {
        cy.intercept('GET', '**/api/notifications/my/unread-count', {
            statusCode: 200,
            body: 1,
        }).as('getUnreadCount');

        cy.intercept('GET', '**/api/notifications/my*', {
            statusCode: 200,
            body: [
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
            ],
        }).as('getNotifications');

        cy.visit('/home');
        cy.wait('@getUnreadCount');
        cy.get('button[aria-label^="알림"]').click();
        cy.wait('@getNotifications');

        cy.contains('파티 신청 접수').should('be.visible');
        cy.contains('새 팔로워').should('be.visible');
    });

    it('shows empty state when there are no notifications', () => {
        cy.intercept('GET', '**/api/notifications/my/unread-count', {
            statusCode: 200,
            body: 0,
        }).as('getUnreadCount');

        cy.intercept('GET', '**/api/notifications/my*', {
            statusCode: 200,
            body: [],
        }).as('getEmptyNotifications');

        cy.visit('/home');
        cy.wait('@getUnreadCount');
        cy.get('button[aria-label^="알림"]').click();
        cy.wait('@getEmptyNotifications');

        cy.contains(/알림이 없|새로운 알림|no notification/i).should('be.visible');
    });

    it('marks all notifications as read when clicking the button', () => {
        cy.intercept('GET', '**/api/notifications/my/unread-count', {
            statusCode: 200,
            body: 1,
        }).as('getUnreadCount');

        cy.intercept('GET', '**/api/notifications/my*', {
            statusCode: 200,
            body: [
                {
                    id: 1,
                    type: 'APPLICATION_RECEIVED',
                    title: '파티 신청 접수',
                    message: '새 신청이 도착했습니다.',
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    relatedId: null,
                },
            ],
        }).as('getNotifications');

        cy.intercept('POST', '**/api/notifications/*/read', {
            statusCode: 200,
            body: { success: true },
        }).as('readOne');

        cy.visit('/home');
        cy.wait('@getUnreadCount');
        cy.get('button[aria-label^="알림"]').click();
        cy.wait('@getNotifications');

        cy.contains(/모두 읽음|전체 읽음|모두 읽기|전체 확인/i).click();
        cy.wait('@readOne');
    });
});
