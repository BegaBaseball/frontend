/// <reference types="cypress" />

describe('Follow / Unfollow Feature', () => {
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

    const setupProfile = (isFollowedByMe: boolean) => {
        cy.intercept('GET', '**/api/users/profile/*', {
            statusCode: 200,
            body: { success: true, data: mockProfile },
        }).as('getProfile');

        cy.intercept('GET', /\/api\/users\/profile\/[^/?#]+\/follow-counts(\?.*)?$/, {
            statusCode: 200,
            body: {
                followerCount: isFollowedByMe ? 11 : 10,
                followingCount: 5,
                isFollowedByMe,
                notifyNewPosts: false,
                blockedByMe: false,
                blockingMe: false,
            },
        }).as('getFollowCounts');

        cy.intercept('GET', `**/api/cheer/user/${profileHandle}/posts*`, {
            statusCode: 200,
            body: { content: [], last: true, totalElements: 0, number: 0 },
        }).as('getUserPosts');
    };

    beforeEach(() => {
        cy.login('user');
        cy.mockAPI();
    });

    it('shows Follow button when not following and toggles to following', () => {
        setupProfile(false);

        cy.intercept('POST', /\/api\/users\/profile\/[^/?#]+\/follow(\?.*)?$/, {
            statusCode: 200,
            body: {
                following: true,
                notifyNewPosts: false,
                followerCount: 11,
                followingCount: 5,
            },
        }).as('toggleFollow');

        cy.visit(profileRoute);
        cy.wait('@getProfile');
        cy.wait('@getFollowCounts');

        cy.contains(/^팔로우$/).click();
        cy.wait('@toggleFollow');

        cy.contains(/팔로잉|언팔로우/i).should('be.visible');
    });

    it('shows Unfollow option when already following', () => {
        setupProfile(true);

        cy.intercept('POST', /\/api\/users\/profile\/[^/?#]+\/follow(\?.*)?$/, {
            statusCode: 200,
            body: {
                following: false,
                notifyNewPosts: false,
                followerCount: 10,
                followingCount: 5,
            },
        }).as('toggleFollow');

        cy.visit(profileRoute);
        cy.wait('@getProfile');
        cy.wait('@getFollowCounts');

        cy.contains(/팔로잉|언팔로우/i).should('be.visible');
    });

    it('updates follower count after follow action', () => {
        setupProfile(false);

        cy.intercept('POST', /\/api\/users\/profile\/[^/?#]+\/follow(\?.*)?$/, {
            statusCode: 200,
            body: {
                following: true,
                notifyNewPosts: false,
                followerCount: 11,
                followingCount: 5,
            },
        }).as('toggleFollow');

        cy.visit(profileRoute);
        cy.wait('@getProfile');
        cy.wait('@getFollowCounts');

        cy.contains('10').should('be.visible');
        cy.contains(/^팔로우$/).click();
        cy.wait('@toggleFollow');

        cy.contains('11').should('be.visible');
    });

    it('opens notification settings dropdown for followed user', () => {
        setupProfile(true);

        cy.intercept('PUT', /\/api\/users\/profile\/[^/?#]+\/follow\/notify(\?.*)?$/, {
            statusCode: 200,
            body: { success: true },
        }).as('updateNotify');

        cy.visit(profileRoute);
        cy.wait('@getProfile');
        cy.wait('@getFollowCounts');

        cy.contains('button', /^팔로잉$/).click({ force: true });
        cy.contains(/새 글 알림 받기|알림 끄기/).click({ force: true });
        cy.wait('@updateNotify');
    });
});
