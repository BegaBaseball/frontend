/// <reference types="cypress" />

describe('Public User Profile Page', () => {
    const profileHandle = '@otheruser';
    const profileRoute = `/profile/${profileHandle}`;
    const profileRouteWithoutAt = '/profile/otheruser';
    const directMessageRoute = '/messages/otheruser';

    const mockProfile = {
        id: 456,
        email: 'other@example.com',
        name: 'OtherUser',
        handle: '@otheruser',
        favoriteTeam: 'LG',
        role: 'ROLE_USER',
        profileImageUrl: null,
        bio: '안녕하세요! 야구를 사랑합니다.',
        cheerPoints: 1200,
    };

    const mockFollowCounts = {
        followerCount: 42,
        followingCount: 15,
        isFollowedByMe: false,
        notifyNewPosts: false,
        blockedByMe: false,
        blockingMe: false,
    };

    const visitProfile = (path = profileRoute) => {
        cy.visit(path);
    };

    const installDmSocketFactory = () => {
        cy.window().then((win) => {
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
        });
    };

    beforeEach(() => {
        const normalizedHandle = profileHandle.trim();
        const normalizedHandleWithAt = normalizedHandle.startsWith('@')
            ? normalizedHandle
            : `@${normalizedHandle}`;
        const normalizedHandleWithoutAt = normalizedHandleWithAt.replace(/^@/, '');
        const encodedWithAt = encodeURIComponent(normalizedHandleWithAt);
        const encodedWithoutAt = encodeURIComponent(normalizedHandleWithoutAt);
        const profilePatterns = [
            `**/api/users/profile/${normalizedHandleWithAt}*`,
            `**/api/users/profile/${encodedWithAt}*`,
            `**/api/users/profile/${normalizedHandleWithoutAt}*`,
            `**/api/users/profile/${encodedWithoutAt}*`,
        ];
        const cheerPostPatterns = [
            `**/api/cheer/user/${normalizedHandleWithAt}/posts*`,
            `**/api/cheer/user/${normalizedHandleWithoutAt}/posts*`,
            `**/api/cheer/user/${encodedWithAt}/posts*`,
            `**/api/cheer/user/${encodedWithoutAt}/posts*`,
        ];

        cy.login('user');
        cy.mockAPI();

        profilePatterns.forEach((pattern) => {
            cy.intercept('GET', pattern, {
                statusCode: 200,
                body: { success: true, data: mockProfile },
            }).as('getProfile');
        });

        cy.mockPublicFollowCounts(profileHandle, mockFollowCounts);

        cheerPostPatterns.forEach((pattern) => {
            cy.intercept('GET', pattern, {
                statusCode: 200,
                body: {
                    content: [],
                    last: true,
                    totalElements: 0,
                    number: 0,
                },
            }).as('getUserPosts');
        });

    });

    it('displays user name and handle', () => {
        visitProfile();

        cy.wait('@getFollowCounts');
        cy.contains('OtherUser').should('be.visible');
        cy.contains('@otheruser').should('be.visible');
    });

    it('displays follower and following counts', () => {
        visitProfile();

        cy.wait('@getFollowCounts');
        cy.contains('42').should('be.visible');
        cy.contains('팔로워').should('be.visible');
        cy.contains('15').should('be.visible');
        cy.contains('팔로잉').should('be.visible');
    });

    it('shows follow button for other users profile', () => {
        visitProfile();

        cy.wait('@getFollowCounts');
        cy.contains(/팔로우|Following|Follow/i).should('be.visible');
    });

    it('shows an active message CTA for followed users and navigates to the dm room', () => {
        cy.mockPublicFollowCounts(profileHandle, {
            ...mockFollowCounts,
            isFollowedByMe: true,
        });
        cy.intercept('POST', '**/api/dm/rooms', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    roomId: 901,
                    membershipState: 'ACTIVE',
                    targetUser: {
                        id: 456,
                        name: 'OtherUser',
                        handle: '@otheruser',
                        favoriteTeam: 'LG',
                        profileImageUrl: null,
                    },
                },
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
                        content: '첫 DM',
                        clientMessageId: null,
                        createdAt: '2026-04-15T12:00:00.000Z',
                    },
                ],
            },
        }).as('getDmMessages');

        visitProfile();

        cy.wait('@getFollowCounts');
        installDmSocketFactory();
        cy.contains('button', '메시지 보내기')
            .should('be.visible')
            .and('not.be.disabled')
            .click();
        cy.wait('@bootstrapDmRoom');
        cy.wait('@getDmMessages');
        cy.url().should('include', directMessageRoute);
        cy.contains('OtherUser').should('be.visible');
        cy.contains('첫 DM').should('be.visible');
    });

    it('keeps the message CTA disabled for non-followers with a reason', () => {
        visitProfile();

        cy.wait('@getFollowCounts');
        cy.contains('button', '작성글 보기')
            .should('be.visible')
            .and('not.be.disabled')
            .and('contain.text', '작성글 보기');
        cy.contains('button', '메시지 보내기')
            .should('be.visible')
            .and('be.disabled');
        cy.contains('팔로우한 사용자에게만 메시지를 보낼 수 있습니다.').should('be.visible');
    });

    it('displays bio text', () => {
        visitProfile();

        cy.contains('OtherUser').should('be.visible');
        cy.contains('안녕하세요! 야구를 사랑합니다.').should('be.visible');
    });

    it('shows empty posts state when user has no posts', () => {
        visitProfile();

        cy.wait('@getUserPosts');
        cy.contains(/게시글이 없|작성한 게시글/i).should('be.visible');
    });

    it('opens follower list modal when clicking follower count', () => {
        visitProfile();
        cy.contains('42').should('be.visible');

        cy.intercept('GET', /\/api\/users\/(?:profile\/[^/?#]+|[^/?#]+)\/followers(?:\?.*)?$/, {
            statusCode: 200,
            body: { content: [], last: true, totalElements: 0, number: 0, size: 20 },
        }).as('getFollowers');

        cy.contains('팔로워').click();
        cy.wait('@getFollowers');
        cy.contains(/팔로워/i).should('be.visible');
    });

    it('loads user posts with a slug path when entering a profile route without @', () => {
        visitProfile(profileRouteWithoutAt);

        cy.wait('@getUserPosts')
            .its('request.url')
            .should('include', '/api/cheer/user/otheruser/posts')
            .and('not.include', '%40otheruser');
        cy.contains('@otheruser').should('be.visible');
    });
});
