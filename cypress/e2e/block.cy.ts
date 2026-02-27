/// <reference types="cypress" />

describe('Block / Unblock Feature', () => {
    const targetUserId = 456;
    const profileHandle = '@otheruser';
    const profileRoute = `/profile/${profileHandle}`;

    const mockProfile = {
        id: targetUserId,
        email: 'other@example.com',
        name: 'OtherUser',
        handle: '@otheruser',
        favoriteTeam: 'LG',
        role: 'ROLE_USER',
        profileImageUrl: null,
        bio: null,
        cheerPoints: 0,
    };

    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();

        cy.intercept('GET', '**/api/users/profile/*', {
            statusCode: 200,
            body: { success: true, data: mockProfile },
        }).as('getProfile');

        cy.intercept('GET', `**/api/cheer/user/${profileHandle}/posts*`, {
            statusCode: 200,
            body: { content: [], last: true, totalElements: 0, number: 0 },
        }).as('getUserPosts');
    });

    it('hides block button on public profile and keeps other actions visible', () => {
        cy.intercept('GET', `**/api/users/${targetUserId}/follow-counts`, {
            statusCode: 200,
            body: {
                followerCount: 10,
                followingCount: 5,
                isFollowedByMe: false,
                notifyNewPosts: false,
                blockedByMe: false,
                blockingMe: false,
            },
        }).as('getFollowCounts');

        cy.visit(profileRoute);
        cy.wait('@getProfile');
        cy.wait('@getFollowCounts');

        cy.contains(/차단/).should('not.exist');
        cy.contains(/메시지 \(준비중\)/).should('be.visible');
    });

    it('opens blocked users section from mypage navigation', () => {
        cy.intercept('GET', '**/api/users/me/blocked*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    content: [
                        {
                            id: targetUserId,
                            name: 'OtherUser',
                            handle: '@otheruser',
                            profileImageUrl: null,
                            favoriteTeam: 'LG',
                        },
                    ],
                    last: true,
                    totalElements: 1,
                    number: 0,
                    size: 20,
                },
            },
        }).as('getBlockedUsers');

        cy.visit('/mypage');
        cy.contains('button', '내 정보 수정').click();
        cy.contains('차단 관리').click();
        cy.wait('@getBlockedUsers');
        cy.contains('OtherUser').should('be.visible');
    });

    it('unblocks user from blocked users section', () => {
        cy.intercept('GET', '**/api/users/me/blocked*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    content: [
                        {
                            id: targetUserId,
                            name: 'OtherUser',
                            handle: '@otheruser',
                            profileImageUrl: null,
                            favoriteTeam: 'LG',
                        },
                    ],
                    last: true,
                    totalElements: 1,
                    number: 0,
                    size: 20,
                },
            },
        }).as('getBlockedUsers');

        cy.intercept('POST', `**/api/users/${targetUserId}/block`, {
            statusCode: 200,
            body: { blocked: false, blockedCount: 0 },
        }).as('unblockUser');

        cy.visit('/mypage');
        cy.contains('button', '내 정보 수정').click();
        cy.contains('차단 관리').click();
        cy.wait('@getBlockedUsers');

        cy.contains(/차단 해제/).click();
        cy.wait('@unblockUser');
    });

    it('keeps profile route accessible while block state is managed in mypage', () => {
        cy.intercept('GET', `**/api/users/${targetUserId}/follow-counts`, {
            statusCode: 200,
            body: {
                followerCount: 10,
                followingCount: 5,
                isFollowedByMe: false,
                notifyNewPosts: false,
                blockedByMe: false,
                blockingMe: false,
            },
        }).as('getFollowCounts');

        cy.visit(profileRoute);
        cy.wait('@getProfile');
        cy.wait('@getFollowCounts');
        cy.contains('@otheruser').should('be.visible');
    });
});
