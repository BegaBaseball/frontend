/// <reference types="cypress" />

describe('Cheer Board', () => {
    const authToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3RVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const uploadCheerFixtureImage = (selector: string) => {
        cy.fixture('tiny-image.base64').then((base64) => {
            cy.get(selector).selectFile({
                contents: Cypress.Buffer.from(base64, 'base64'),
                fileName: 'cheer-image.png',
                mimeType: 'image/png',
            }, { force: true });
        });
    };
    const interceptCheerMediaUploads = () => {
        let nextAssetId = 8100;

        cy.intercept('POST', '**/api/media/uploads/init', (req) => {
            expect(req.body.domain).to.eq('CHEER');
            const assetId = nextAssetId++;
            req.reply({
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        assetId,
                        uploadUrl: `https://object.example.com/upload/cheer-${assetId}`,
                        stagingObjectKey: `media/staging/cheer/123/${assetId}-${req.body.fileName}`,
                        expiresAt: '2026-04-14T00:00:00Z',
                        requiredHeaders: {
                            'Content-Type': req.body.contentType || 'image/png',
                        },
                    },
                },
            });
        }).as('initCheerMediaUpload');

        cy.intercept('PUT', 'https://object.example.com/upload/cheer-*', {
            statusCode: 200,
            body: '',
        }).as('putCheerMediaUpload');

        cy.intercept('POST', /\/api\/media\/uploads\/\d+\/finalize$/, (req) => {
            const match = req.url.match(/\/api\/media\/uploads\/(\d+)\/finalize$/);
            const assetId = Number(match?.[1] || 0);
            req.reply({
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        assetId,
                        storagePath: `media/cheer/123/${assetId}.webp`,
                        publicUrl: `https://cdn.example.com/media/cheer/123/${assetId}.webp`,
                    },
                },
            });
        }).as('finalizeCheerMediaUpload');
    };
    const expectSquareSize = ($element: JQuery<HTMLElement>, size: number) => {
        const { width, height } = $element[0].getBoundingClientRect();

        expect(Math.round(width)).to.eq(size);
        expect(Math.round(height)).to.eq(size);
    };
    const expectCheerAvatarFrame = ($element: JQuery<HTMLElement>, size: number) => {
        expect($element).to.have.class('rounded-full');
        expect($element).to.have.class('inline-flex');
        expect($element).to.have.class('items-center');
        expect($element).to.have.class('justify-center');
        expect($element).to.have.class('ring-1');
        expect($element).to.have.class('ring-inset');
        expect($element).not.to.have.class('p-px');
        expectSquareSize($element, size);
    };
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

        it('should render cheer avatar frames and composer ring with stable sizing', () => {
            getOwnedPostCard().find('[data-testid="profile-avatar-frame"]').first()
                .and(($frame) => {
                    expectCheerAvatarFrame($frame, 40);
                })
                .find('[data-testid="profile-avatar-image"], [data-testid="profile-avatar-fallback"]').first()
                .should(($surface) => {
                    expect($surface).to.have.class('w-full');
                    expect($surface).to.have.class('h-full');

                    if ($surface.attr('data-testid') === 'profile-avatar-image') {
                        expect(['svg', 'img']).to.include($surface.prop('tagName').toLowerCase());
                        expect($surface).to.have.class('block');
                    } else {
                        expect($surface).to.have.class('rounded-full');
                        expect($surface).to.have.class('flex');
                    }
                });

            cy.get('textarea[placeholder*="응원"]').first()
                .closest('div.flex-1')
                .prev()
                .as('composerAvatarSlot');

            cy.get('@composerAvatarSlot').should(($slot) => {
                expectSquareSize($slot, 40);
                });

            cy.get('@composerAvatarSlot').find('[data-testid="profile-avatar-frame"]').first()
                .and(($frame) => {
                    expectSquareSize($frame, 40);

                    if ($frame.hasClass('rounded-full')) {
                        expectCheerAvatarFrame($frame, 40);
                    } else {
                        expect($frame).to.have.class('inline-flex');
                        expect($frame).to.have.class('items-center');
                        expect($frame).to.have.class('justify-center');
                    }
                });

            cy.get('@composerAvatarSlot').find('[data-testid="profile-avatar-frame"]').first()
                .then(($frame) => {
                    const avatarSurface = $frame.find('[data-testid="profile-avatar-image"], [data-testid="profile-avatar-fallback"]').first();

                    if (avatarSurface.length > 0) {
                        cy.wrap(avatarSurface).should(($surface) => {
                            expect($surface).to.have.class('w-full');
                            expect($surface).to.have.class('h-full');

                            if ($surface.attr('data-testid') === 'profile-avatar-image') {
                                expect(['svg', 'img']).to.include($surface.prop('tagName').toLowerCase());
                                expect($surface).to.have.class('block');
                            } else {
                                expect($surface).to.have.class('rounded-full');
                                expect($surface).to.have.class('flex');
                            }
                        });
                        return;
                    }

                    cy.wrap($frame).children().first().should(($surface) => {
                        expect($surface).to.have.class('avatar-edge-smooth');
                        expect($surface).to.have.class('h-full');
                        expect($surface).to.have.class('w-full');
                        expect($surface).to.have.class('border');
                    });
                });
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

        it('should create a new post with uploaded images', () => {
            const content = 'Winning post with image!';
            interceptCheerMediaUploads();

            cy.intercept('POST', '**/api/cheer/posts', (req) => {
                expect(req.body.content).to.eq(content);
                expect(req.body.images).to.deep.equal(['media/cheer/123/8100.webp']);
                req.reply({
                    statusCode: 200,
                    body: {
                        id: 30,
                        content,
                        author: 'TestUser',
                        authorId: 123,
                        authorHandle: 'testuser',
                        teamId: 'HH',
                        team: 'HH',
                        authorTeamId: 'HH',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        postType: 'NORMAL',
                        images: ['media/cheer/123/8100.webp'],
                        imageUrls: ['https://cdn.example.com/media/cheer/123/8100.webp'],
                    },
                });
            }).as('createPostWithImage');

            cy.get('textarea[placeholder*="응원"]').first().type(content);
            uploadCheerFixtureImage('input[type="file"]');
            cy.get('button[data-testid="write-post-btn"]').click();

            cy.wait('@initCheerMediaUpload');
            cy.wait('@putCheerMediaUpload');
            cy.wait('@finalizeCheerMediaUpload');
            cy.wait('@createPostWithImage');
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

        it('should update an owned post with a newly uploaded image', () => {
            const updatedContent = 'This is an edited test post with image.';
            interceptCheerMediaUploads();

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
                    imageUrls: [],
                },
            }).as('getPostForEditWithNewImage');

            cy.intercept('GET', '**/api/cheer/posts/1/images', {
                statusCode: 200,
                body: [],
            }).as('getPostImagesForNewImage');

            cy.intercept('PUT', '**/api/cheer/posts/1', (req) => {
                expect(req.body.content).to.eq(updatedContent);
                expect(req.body.images).to.deep.equal(['media/cheer/123/8100.webp']);
                req.reply({
                    statusCode: 200,
                    body: {
                        id: 1,
                        content: updatedContent,
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
                        images: ['media/cheer/123/8100.webp'],
                        imageUrls: ['https://cdn.example.com/media/cheer/123/8100.webp'],
                    },
                });
            }).as('updatePostWithImage');

            cy.get('button[aria-label="게시글 옵션"]').should('have.length', 1);
            getOwnedPostCard().find('button[aria-label="게시글 옵션"]').click();
            cy.contains('수정하기').click();

            cy.url().should('include', '/cheer/edit/1');
            cy.wait('@getPostForEditWithNewImage');
            cy.wait('@getPostImagesForNewImage');

            cy.get('textarea:visible').first().clear().type(updatedContent);
            uploadCheerFixtureImage('input[aria-label="이미지 파일 선택"]');
            cy.get('button').contains('수정 완료').click();

            cy.wait('@initCheerMediaUpload');
            cy.wait('@putCheerMediaUpload');
            cy.wait('@finalizeCheerMediaUpload');
            cy.wait('@updatePostWithImage')
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
            cy.get('[role="menu"], [role="dialog"]').should('be.visible');
            // 메뉴 버튼이 sticky navbar에 가려지는 케이스를 회피한다.
            cy.get('[role="menu"], [role="dialog"]').contains('button', /^리포스트$/).first().click({ force: true });
            cy.wait('@toggleRepost')
                .its('request.url')
                .should('include', '/api/cheer/posts/2/repost');
        });
    });
});
