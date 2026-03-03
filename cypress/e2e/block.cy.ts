/// <reference types="cypress" />

describe('Block / Unblock Feature', () => {
    const targetUserId = 456;
    const profileHandle = '@otheruser';
    const profileRoute = `/profile/${profileHandle}`;
    const fakeToken = 'e2e-block-token';
    const authState = {
        state: {
            user: {
                id: 123,
                email: 'test@example.com',
                name: 'TestUser',
                handle: '@testuser',
                role: 'ROLE_USER',
                favoriteTeam: 'HH',
                profileImageUrl: null,
                hasPassword: true,
            },
            isLoggedIn: true,
            isAdmin: false,
        },
        version: 0,
    };

    const bootstrapAuthenticatedWindow = (win: Window) => {
        const originalAddEventListener = win.addEventListener.bind(win);
        win.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
            if (type === 'auth-session-expired' || type === 'global-api-error') {
                return;
            }
            return originalAddEventListener(type, listener, options);
        }) as typeof win.addEventListener;

        win.localStorage.setItem('auth-storage', JSON.stringify(authState));
        win.localStorage.setItem('accessToken', fakeToken);
        win.localStorage.setItem('bega_has_visited', 'true');
        win.localStorage.setItem('bega_dont_show_guide', 'true');
    };

    const visitAsLoggedIn = (path: string) => {
        cy.visit(path, {
            onBeforeLoad: bootstrapAuthenticatedWindow,
        });
        cy.window().then((win) => {
            win.localStorage.setItem('auth-storage', JSON.stringify(authState));
            win.localStorage.setItem('accessToken', fakeToken);
        });
        cy.setCookie('Authorization', fakeToken);
    };

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

        visitAsLoggedIn(profileRoute);
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

        visitAsLoggedIn('/mypage');
        cy.wait('@getMe');
        cy.contains('button', '내 정보 수정', { timeout: 20000 })
            .should('be.visible')
            .as('editProfileButton');
        cy.get('@editProfileButton').click({ force: true });
        cy.url().should('include', 'view=editProfile');
        cy.contains('button', '차단 관리', { timeout: 20000 })
            .scrollIntoView()
            .click({ force: true });
        cy.url().should('include', 'view=blockedUsers');
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

        visitAsLoggedIn('/mypage');
        cy.wait('@getMe');
        cy.contains('button', '내 정보 수정', { timeout: 20000 })
            .should('be.visible')
            .as('editProfileButton');
        cy.get('@editProfileButton').click({ force: true });
        cy.url().should('include', 'view=editProfile');
        cy.contains('button', '차단 관리', { timeout: 20000 })
            .scrollIntoView()
            .click({ force: true });
        cy.url().should('include', 'view=blockedUsers');
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

        visitAsLoggedIn(profileRoute);
        cy.wait('@getProfile');
        cy.wait('@getFollowCounts');
        cy.contains('@otheruser').should('be.visible');
    });
});
