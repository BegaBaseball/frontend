/// <reference types="cypress" />

describe('Cheer Board', () => {
    const authToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3RVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const seedLoggedInUser = (win: Window) => {
        win.localStorage.setItem(
            'auth-storage',
            JSON.stringify({
                state: {
                    user: {
                        id: 123,
                        email: 'test@example.com',
                        name: 'TestUser',
                        handle: 'testuser',
                        favoriteTeam: 'HH',
                        role: 'ROLE_USER',
                        isAdmin: false,
                        profileImageUrl: null,
                        hasPassword: true,
                        policyConsentRequired: false,
                        policyConsentNoticeRequired: false,
                        missingPolicyTypes: [],
                    },
                    isLoggedIn: true,
                    isAdmin: false,
                },
                version: 0,
            })
        );
        win.localStorage.setItem('accessToken', authToken);
        win.localStorage.setItem('bega_has_visited', 'true');
        win.localStorage.setItem('bega_dont_show_guide', 'true');
    };
    const mockUserProfile = {
        success: true,
        data: {
            id: 123,
            email: 'test@example.com',
            name: 'TestUser',
            handle: 'testuser',
            favoriteTeam: 'HH',
            role: 'ROLE_USER',
            hasPassword: true,
            profileImageUrl: null,
            policyConsentRequired: false,
            policyConsentNoticeRequired: false,
            missingPolicyTypes: [],
        },
    };
    const makePost = (overrides: Record<string, unknown> = {}) => ({
        id: 1,
        content: 'This is a test post content.',
        author: 'TestUser',
        authorId: 123,
        authorHandle: 'testuser',
        teamId: 'HH',
        team: 'HH',
        authorTeamId: 'HH',
        timeAgo: '2024. 03. 20.',
        comments: 0,
        likes: 0,
        likeCount: 0,
        commentCount: 0,
        bookmarkCount: 0,
        repostCount: 0,
        views: 0,
        liked: false,
        likedByUser: false,
        bookmarked: false,
        isBookmarked: false,
        repostedByMe: false,
        postType: 'NORMAL',
        isOwner: false,
        isHot: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        images: [],
        imageUrls: [],
        ...overrides,
    });

    const getOwnedPostCard = () =>
        cy.get('button[aria-label="게시글 옵션"]').first().closest('div.group');
    const getNonOwnedPostCard = () =>
        cy.get('div.group')
            .filter(':has(button[aria-label*="좋아요"])')
            .not(':has(button[aria-label="게시글 옵션"])')
            .first();

    beforeEach(() => {
        cy.mockAPI();
        cy.intercept('GET', '**/auth/mypage*', {
            statusCode: 200,
            body: mockUserProfile,
        }).as('getMeAnyPath');

        // Standard posts mock
        cy.intercept('GET', '**/api/cheer/posts/hot*', {
            statusCode: 200,
            body: {
                content: [
                    makePost({
                        id: 10,
                        content: 'Popular post 1',
                        author: 'HotUser',
                        authorId: 210,
                        authorHandle: 'hotuser',
                        comments: 50,
                        commentCount: 50,
                        likes: 100,
                        likeCount: 100,
                        views: 1000,
                    }),
                    makePost({
                        id: 11,
                        content: 'Popular post 2',
                        author: 'HotUser2',
                        authorId: 211,
                        authorHandle: 'hotuser2',
                        teamId: 'OB',
                        team: 'OB',
                        authorTeamId: 'OB',
                        timeAgo: '2024. 03. 21.',
                        comments: 20,
                        commentCount: 20,
                        likes: 200,
                        likeCount: 200,
                        views: 2000,
                    }),
                ],
                last: true,
                totalPages: 1,
                totalElements: 2,
                size: 20,
                number: 0
            }
        }).as('getPopularPosts');

        cy.intercept('GET', '**/api/cheer/posts*', (req) => {
            if (req.url.includes('/api/cheer/posts/hot')) {
                return; // Let getPopularPosts handle it
            }
            req.reply({
                statusCode: 200,
                body: {
                    content: [
                        makePost({
                            id: 1,
                            content: 'This is a test post content.',
                            comments: 2,
                            commentCount: 2,
                            likes: 5,
                            likeCount: 5,
                            views: 100,
                            isOwner: true,
                        }),
                        makePost({
                            id: 2,
                            content: 'Another test post.',
                            author: 'OtherUser',
                            authorId: 124,
                            authorHandle: 'otheruser',
                            teamId: 'OB',
                            team: 'OB',
                            authorTeamId: 'OB',
                            timeAgo: '2024. 03. 21.',
                            comments: 0,
                            commentCount: 0,
                            likes: 10,
                            likeCount: 10,
                            likedByUser: true,
                            liked: true,
                            views: 200,
                            isOwner: false,
                        }),
                    ],
                    last: true,
                    totalPages: 1,
                    totalElements: 2,
                    size: 20,
                    number: 0
                }
            });
        }).as('getPosts');

        cy.visit('/cheer', {
            onBeforeLoad(win) {
                seedLoggedInUser(win);
            },
        });
        // Wait for hydration and user greeting
        cy.contains('TestUser 님', { timeout: 20000 }).should('be.visible');
        cy.wait('@getPosts');
    });

    describe('Public View', () => {
        it('should display list of posts', () => {
            cy.contains('This is a test post content.').should('be.visible');
            cy.contains('Another test post.').should('be.visible');
        });

        it('should switch feed tabs', () => {
            // "인기" tab has sort=views,desc
            cy.contains('button', '인기').click();

            // Should trigger a new request with sort parameter
            cy.wait('@getPopularPosts');
            cy.contains('Popular post 1').should('be.visible');
        });
    });

    describe('Interactions (Requires Login)', () => {
        it('should create a new post', () => {
            const content = 'Winning post!';

            cy.intercept('POST', '**/api/cheer/posts', {
                statusCode: 200,
                body: {
                    id: 3,
                    content: content,
                    author: 'TestUser',
                    teamId: 'HH',
                    postType: 'NORMAL',
                    createdAt: new Date().toISOString()
                }
            }).as('createPost');

            // The textarea has placeholder text that involves "응원"
            cy.get('textarea[placeholder*="응원"]').first().type(content);
            cy.get('button[data-testid="write-post-btn"]').click();

            cy.wait('@createPost');

            // Check for the new post - it should appear via optimistic update or refetch
            cy.contains(content, { timeout: 10000 }).should('be.visible');
        });

        it('should toggle like on a post', () => {
            cy.intercept('POST', '**/api/cheer/posts/1/like', {
                statusCode: 200,
                body: { liked: true, likes: 6 }
            }).as('toggleLike');

            getOwnedPostCard().find('button[aria-label*="좋아요"]').first().click();
            cy.wait('@toggleLike')
                .its('request.url')
                .should('include', '/api/cheer/posts/1/like');
            getOwnedPostCard()
                .find('button[aria-label*="좋아요"]')
                .first()
                .should('have.attr', 'aria-pressed', 'true')
                .invoke('attr', 'aria-label')
                .should('include', '6');
        });

        it('should update an owned post', () => {
            const updatedContent = 'This is an edited test post.';

            cy.intercept('GET', '**/api/cheer/posts/1', {
                statusCode: 200,
                body: {
                    id: 1,
                    content: 'This is a test post content.',
                    author: 'TestUser',
                    authorId: 123,
                    authorHandle: 'testuser',
                    teamId: 'HH',
                    team: 'HH',
                    authorTeamId: 'HH',
                    timeAgo: '방금 전',
                    comments: 2,
                    likes: 5,
                    likeCount: 5,
                    commentCount: 2,
                    bookmarkCount: 0,
                    repostCount: 0,
                    views: 100,
                    liked: false,
                    likedByUser: false,
                    bookmarked: false,
                    isBookmarked: false,
                    repostedByMe: false,
                    postType: 'NORMAL',
                    isOwner: true,
                    isHot: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    images: [],
                    imageUrls: []
                }
            }).as('getPostForEdit');

            cy.intercept('GET', '**/api/cheer/posts/1/images', {
                statusCode: 200,
                body: [],
            }).as('getPostImages');

            cy.intercept('PUT', '**/api/cheer/posts/1', (req) => {
                expect(req.body.content).to.eq(updatedContent);
                req.reply({
                    statusCode: 200,
                    body: {
                        id: 1,
                        content: updatedContent,
                        author: 'TestUser',
                        teamId: 'HH',
                        team: 'HH',
                        authorId: 123,
                        authorHandle: 'testuser',
                        authorTeamId: 'HH',
                        timeAgo: '방금 전',
                        comments: 2,
                        likes: 5,
                        likeCount: 5,
                        commentCount: 2,
                        bookmarkCount: 0,
                        repostCount: 0,
                        views: 100,
                        liked: false,
                        likedByUser: false,
                        bookmarked: false,
                        isBookmarked: false,
                        repostedByMe: false,
                        postType: 'NORMAL',
                        isOwner: true,
                        isHot: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        images: [],
                        imageUrls: [],
                    },
                });
            }).as('updatePost');

            cy.get('button[aria-label="게시글 옵션"]').should('have.length', 1);
            getOwnedPostCard().find('button[aria-label="게시글 옵션"]').click();
            cy.contains('수정하기').click();

            cy.url().should('include', '/cheer/edit/1');
            cy.wait('@getPostForEdit');
            cy.wait('@getPostImages');

            cy.get('textarea:visible').first().clear().type(updatedContent);
            cy.get('button').contains('수정 완료').click();
            cy.wait('@updatePost')
                .its('request.url')
                .should('include', '/api/cheer/posts/1');
        });

        it('should delete an owned post', () => {
            cy.intercept('DELETE', '**/api/cheer/posts/1', {
                statusCode: 200
            }).as('deletePost');

            cy.get('button[aria-label="게시글 옵션"]').should('have.length', 1);
            getOwnedPostCard().find('button[aria-label="게시글 옵션"]').click();
            cy.contains('삭제하기').click();
            cy.contains('button', '삭제').click();

            cy.wait('@deletePost')
                .its('request.url')
                .should('include', '/api/cheer/posts/1');
        });

        it('should toggle bookmark on a post', () => {
            cy.intercept('POST', '**/api/cheer/posts/1/bookmark', {
                statusCode: 200,
                body: { bookmarked: true, count: 1 }
            }).as('toggleBookmark');

            getOwnedPostCard().find('button[aria-label="북마크"]').click();
            cy.wait('@toggleBookmark')
                .its('request.url')
                .should('include', '/api/cheer/posts/1/bookmark');
        });

        it('should toggle repost on a post', () => {
            cy.intercept('POST', '**/api/cheer/posts/2/repost', {
                statusCode: 200,
                body: { reposted: true, count: 1 }
            }).as('toggleRepost');

            getNonOwnedPostCard().find('button[aria-label*="리포스트"]').click();
            cy.get('[role="dialog"]').should('be.visible');
            cy.get('[role="dialog"]').contains('button', '리포스트').first().click();
            cy.wait('@toggleRepost')
                .its('request.url')
                .should('include', '/api/cheer/posts/2/repost');
        });
    });
});
