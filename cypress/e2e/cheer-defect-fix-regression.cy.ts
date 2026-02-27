/// <reference types="cypress" />

describe('Cheer 커뮤니티 결함 해결 검증', () => {
    const authToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3RVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const seedAuthState = (win: Window, role: 'ROLE_USER' | 'ROLE_ADMIN' = 'ROLE_USER') => {
        const isAdmin = role === 'ROLE_ADMIN';
        const id = isAdmin ? 2 : 123;
        const name = isAdmin ? 'AdminUser' : 'TestUser';
        const handle = isAdmin ? 'admin' : 'testuser';
        const email = isAdmin ? 'admin@example.com' : 'test@example.com';

        win.localStorage.setItem(
            'auth-storage',
            JSON.stringify({
                state: {
                    user: {
                        id,
                        email,
                        name,
                        handle,
                        favoriteTeam: 'HH',
                        role,
                        isAdmin,
                        profileImageUrl: null,
                        hasPassword: true,
                        policyConsentRequired: false,
                        policyConsentNoticeRequired: false,
                        missingPolicyTypes: [],
                    },
                    isLoggedIn: true,
                    isAdmin,
                },
                version: 0,
            })
        );
        win.localStorage.setItem('accessToken', authToken);
        win.localStorage.setItem('bega_has_visited', 'true');
        win.localStorage.setItem('bega_dont_show_guide', 'true');
    };
    const stubAuthProfile = (role: 'ROLE_USER' | 'ROLE_ADMIN' = 'ROLE_USER') => {
        const isAdmin = role === 'ROLE_ADMIN';
        cy.intercept('GET', '**/auth/mypage*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    id: isAdmin ? 2 : 123,
                    email: isAdmin ? 'admin@example.com' : 'test@example.com',
                    name: isAdmin ? 'AdminUser' : 'TestUser',
                    handle: isAdmin ? 'admin' : 'testuser',
                    favoriteTeam: 'HH',
                    role,
                    profileImageUrl: null,
                    hasPassword: true,
                    policyConsentRequired: false,
                    policyConsentNoticeRequired: false,
                    missingPolicyTypes: [],
                },
            },
        }).as('getMeAnyPath');
    };

    it('1) NoticePage 글쓰기 버튼이 /cheer/write로 이동하고 작성 composer가 열린다', () => {
        const noticePost = {
            id: 901,
            content: '공지 게시글 샘플',
            author: 'Admin',
            authorId: 1,
            authorHandle: 'admin',
            teamId: 'HH',
            team: 'HH',
            teamColor: 'HH',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            comments: 0,
            likes: 0,
            likeCount: 0,
            commentCount: 0,
            bookmarkCount: 0,
            repostCount: 0,
            views: 10,
            liked: false,
            likedByUser: false,
            bookmarked: false,
            isBookmarked: false,
            repostedByMe: false,
            repostType: undefined,
            postType: 'NOTICE',
            isOwner: true,
            isHot: false,
            images: [],
            imageUrls: [],
        };

        cy.mockAPI();
        stubAuthProfile('ROLE_ADMIN');
        cy.intercept('GET', '**/api/auth/mypage*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    id: 2,
                    email: 'admin@example.com',
                    name: 'AdminUser',
                    handle: 'admin',
                    favoriteTeam: 'LG',
                    role: 'ROLE_ADMIN',
                    profileImageUrl: null,
                    hasPassword: true,
                    bio: 'Admin here.',
                },
            },
        }).as('getAdminMe');

        cy.intercept('GET', '**/api/cheer/posts*', (req) => {
            if (req.url.includes('postType=NOTICE')) {
                req.reply({
                    statusCode: 200,
                    body: {
                        content: [noticePost],
                        last: true,
                        totalPages: 1,
                        totalElements: 1,
                        size: 20,
                        number: 0,
                    },
                });
                return;
            }

            req.reply({
                statusCode: 200,
                body: {
                    content: [
                        {
                            ...noticePost,
                            id: 11,
                            content: '일반 포스트',
                            postType: 'NORMAL',
                        },
                    ],
                    last: true,
                    totalPages: 1,
                    totalElements: 1,
                    size: 20,
                    number: 0,
                },
            });
        }).as('getCheerPosts');

        cy.visit('/notice', {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_ADMIN');
            },
        });
        cy.wait('@getAdminMe');
        cy.wait('@getCheerPosts');
        cy.contains('button', '글쓰기').click();

        cy.url().should('include', '/cheer/write');
        cy.get('textarea[placeholder*="응원"]').should('be.visible');
        cy.get('[data-testid="write-post-btn"]').should('be.visible');
    });

    it('2) 비로그인 상태에서 전체 탭이 teamId=all 없이 조회되어야 한다', () => {
        cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 401 });
        cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 });

        cy.intercept('GET', '**/api/cheer/posts*', (req) => {
            expect(req.url).not.to.contain('teamId=all');

            req.reply({
                statusCode: 200,
                body: {
                    content: [
                        {
                            id: 11,
                            content: '비로그인 전체 피드 공개 샘플',
                            author: 'guest-user',
                            authorId: 100,
                            authorHandle: 'guestuser',
                            teamId: 'HH',
                            team: 'HH',
                            teamColor: 'HH',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            comments: 0,
                            likes: 1,
                            likeCount: 1,
                            commentCount: 0,
                            bookmarkCount: 0,
                            repostCount: 0,
                            views: 0,
                            liked: false,
                            likedByUser: false,
                            bookmarked: false,
                            isBookmarked: false,
                            repostedByMe: false,
                            repostType: undefined,
                            postType: 'NORMAL',
                            isOwner: false,
                            isHot: false,
                            images: [],
                            imageUrls: [],
                        },
                    ],
                    last: true,
                    totalPages: 1,
                    totalElements: 1,
                    size: 20,
                    number: 0,
                },
            });
        }).as('getAllPosts');

        cy.intercept('GET', '**/api/cheer/posts/*/comments*', {
            statusCode: 200,
            body: { content: [], totalElements: 0, totalPages: 1, last: true, size: 20, number: 0 },
        });

        cy.visit('/cheer', {
            onBeforeLoad: (win) => {
                win.localStorage.clear();
                win.sessionStorage.clear();
            },
        });

        cy.wait('@getAllPosts');
        cy.contains('비로그인 전체 피드 공개 샘플').should('be.visible');
    });

    it('3) 새 글 작성 시 payload postType이 NORMAL로 전송된다', () => {
        cy.mockAPI();
        stubAuthProfile('ROLE_USER');

        cy.intercept('GET', '**/api/cheer/posts*', {
            statusCode: 200,
            body: {
                content: [],
                last: true,
                totalPages: 1,
                totalElements: 0,
                size: 20,
                number: 0,
            },
        });

        cy.intercept('POST', '**/api/cheer/posts', (req) => {
            expect(req.body.postType).to.eq('NORMAL');

            req.reply({
                statusCode: 200,
                body: {
                    id: 500,
                    content: req.body.content,
                    author: 'TestUser',
                    authorId: 123,
                    authorHandle: 'testuser',
                    teamId: 'HH',
                    team: 'HH',
                    teamColor: 'HH',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
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
                    repostType: undefined,
                    isOwner: true,
                    isHot: false,
                    images: [],
                    imageUrls: [],
                },
            });
        }).as('createCheerPost');

        cy.visit('/cheer', {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_USER');
            },
        });
        cy.get('textarea[placeholder*="응원"]').type('Cypress postType check');
        cy.get('[data-testid="write-post-btn"]').click();

        cy.wait('@createCheerPost');
    });

    it('4) 단순 리포스트 상세에서 액션 상태/목표가 원글 기준으로 정합화된다', () => {
        cy.mockAPI();
        stubAuthProfile('ROLE_USER');

        const originalPostId = 1;
        const repostPostId = 20;

        cy.intercept('GET', `**/api/cheer/posts/${repostPostId}`, {
            statusCode: 200,
            body: {
                id: repostPostId,
                content: '리포스트 본문',
                author: 'reposter',
                authorId: 11,
                authorHandle: 'reposter',
                teamId: 'HH',
                team: 'HH',
                teamColor: 'HH',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                comments: 1,
                commentCount: 1,
                likes: 2,
                likeCount: 2,
                bookmarkCount: 0,
                repostCount: 1,
                views: 10,
                liked: false,
                likedByUser: false,
                bookmarked: false,
                isBookmarked: false,
                repostedByMe: false,
                repostType: 'SIMPLE',
                originalPost: {
                    id: originalPostId,
                    content: '원글 본문',
                    author: 'original',
                    authorId: 22,
                    authorHandle: 'original',
                    teamId: 'HH',
                    team: 'HH',
                    createdAt: new Date().toISOString(),
                    authorProfileImageUrl: null,
                    teamColor: 'HH',
                    deleted: false,
                    likeCount: 99,
                    commentCount: 3,
                    repostCount: 7,
                    imageUrls: [],
                    images: [],
                },
                originalDeleted: false,
                postType: 'NORMAL',
                isOwner: false,
                isHot: false,
                images: [],
                imageUrls: [],
            },
        });

        cy.intercept('GET', `**/api/cheer/posts/${originalPostId}`, {
            statusCode: 200,
            body: {
                id: originalPostId,
                content: '원글 본문',
                author: 'original',
                authorId: 22,
                authorHandle: 'original',
                teamId: 'HH',
                team: 'HH',
                teamColor: 'HH',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                comments: 3,
                commentCount: 3,
                likes: 99,
                likeCount: 99,
                bookmarked: true,
                isBookmarked: true,
                repostedByMe: true,
                bookmarkCount: 4,
                repostCount: 7,
                views: 120,
                liked: true,
                likedByUser: true,
                repostType: undefined,
                postType: 'NORMAL',
                isOwner: false,
                isHot: false,
                images: [],
                imageUrls: [],
            },
        });

        cy.intercept('GET', '**/api/cheer/posts/*/comments*', {
            statusCode: 200,
            body: { content: [], totalElements: 0, totalPages: 1, last: true, size: 20, number: 0 },
        });

        cy.intercept('POST', `**/api/cheer/posts/${originalPostId}/like`, (req) => {
            req.alias = 'toggleLike';
            req.reply({
                statusCode: 200,
                body: { liked: true, likes: 100 },
            });
        });
        cy.intercept('POST', `**/api/cheer/posts/${originalPostId}/bookmark`, (req) => {
            req.alias = 'toggleBookmark';
            req.reply({
                statusCode: 200,
                body: { bookmarked: true, count: 5 },
            });
        });
        cy.intercept('POST', `**/api/cheer/posts/${originalPostId}/repost`, (req) => {
            req.alias = 'toggleRepost';
            req.reply({
                statusCode: 200,
                body: {
                    liked: true,
                    likes: 100,
                    bookmarked: true,
                    count: 8,
                    reposted: true,
                },
            });
        });

        cy.visit(`/cheer/${repostPostId}`, {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_USER');
            },
        });

        cy.contains('리포스트 본문').should('be.visible');
        cy.get('article .mt-6.flex.flex-wrap').as('actionBar');
        cy.get('@actionBar').find('button:has(svg.lucide-heart)').should('have.length', 1).first().as('likeButton');
        cy.get('@actionBar').find('button[aria-label*="리포스트"]').should('have.length', 1).first().as('repostButton');
        cy.get('@actionBar').find('button:has(svg.lucide-bookmark)').should('have.length', 1).first().as('bookmarkButton');

        cy.get('@likeButton').should('contain', '99');
        cy.get('@likeButton').find('svg').should('have.class', 'fill-current');
        cy.get('@repostButton').should('contain', '7');
        cy.get('@repostButton').should('have.class', 'bg-emerald-50');
        cy.get('@bookmarkButton').find('svg').should('have.class', 'fill-current');

        cy.get('@likeButton').click();
        cy.wait('@toggleLike');
        cy.get('@toggleLike')
            .its('request.url')
            .should('include', `/api/cheer/posts/${originalPostId}/like`);

        cy.get('@bookmarkButton').click();
        cy.wait('@toggleBookmark');
        cy.get('@toggleBookmark')
            .its('request.url')
            .should('include', `/api/cheer/posts/${originalPostId}/bookmark`);

        cy.get('@repostButton').click();
        cy.contains('리포스트 취소').click();
        cy.wait('@toggleRepost');
        cy.get('@toggleRepost')
            .its('request.url')
            .should('include', `/api/cheer/posts/${originalPostId}/repost`);
    });

    it('5) 공지/인기/팔로우 탭 회귀 동작을 점검한다', () => {
        cy.mockAPI();
        stubAuthProfile('ROLE_USER');

        const now = new Date().toISOString();

        cy.intercept('GET', '**/api/cheer/posts*postType=NOTICE*', {
            statusCode: 200,
            body: {
                content: [{
                    id: 901,
                    content: '공지 글',
                    author: 'Admin',
                    authorId: 1,
                    authorHandle: 'admin',
                    teamId: 'HH',
                    team: 'HH',
                    teamColor: 'HH',
                    createdAt: now,
                    updatedAt: now,
                    comments: 0,
                    likes: 1,
                    likeCount: 1,
                    commentCount: 0,
                    bookmarkCount: 0,
                    repostCount: 0,
                    views: 0,
                    liked: false,
                    likedByUser: false,
                    bookmarked: false,
                    isBookmarked: false,
                    repostedByMe: false,
                    repostType: undefined,
                    postType: 'NOTICE',
                    isOwner: false,
                    isHot: false,
                    images: [],
                    imageUrls: [],
                }],
                last: true,
                totalPages: 1,
                totalElements: 1,
                size: 20,
                number: 0,
            },
        }).as('getNoticePosts');

        cy.intercept('GET', '**/api/cheer/posts*', (req) => {
            if (req.url.includes('postType=NOTICE')) return;

            req.reply({
                statusCode: 200,
                body: {
                    content: [{
                        id: 11,
                        content: '전체 탭 글',
                        author: 'TestUser',
                        authorId: 11,
                        authorHandle: 'testuser',
                        teamId: 'HH',
                        team: 'HH',
                        teamColor: 'HH',
                        createdAt: now,
                        updatedAt: now,
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
                        repostType: undefined,
                        postType: 'NORMAL',
                        isOwner: false,
                        isHot: false,
                        images: [],
                        imageUrls: [],
                    }],
                    last: true,
                    totalPages: 1,
                    totalElements: 1,
                    size: 20,
                    number: 0,
                },
            });
        }).as('getAllPosts');

        cy.intercept('GET', '**/api/cheer/posts/hot*', {
            statusCode: 200,
            body: {
                content: [{
                    id: 21,
                    content: '인기 탭 글',
                    author: 'Popular',
                    authorId: 21,
                    authorHandle: 'popular',
                    teamId: 'HH',
                    team: 'HH',
                    teamColor: 'HH',
                    createdAt: now,
                    updatedAt: now,
                    comments: 0,
                    likes: 10,
                    likeCount: 10,
                    commentCount: 0,
                    bookmarkCount: 0,
                    repostCount: 0,
                    views: 12,
                    liked: false,
                    likedByUser: false,
                    bookmarked: false,
                    isBookmarked: false,
                    repostedByMe: false,
                    repostType: undefined,
                    postType: 'NORMAL',
                    isOwner: false,
                    isHot: false,
                    images: [],
                    imageUrls: [],
                }],
                last: true,
                totalPages: 1,
                totalElements: 1,
                size: 20,
                number: 0,
            },
        }).as('getHotPosts');

        cy.intercept('GET', '**/api/cheer/posts/following*', {
            statusCode: 200,
            body: {
                content: [{
                    id: 31,
                    content: '팔로우 탭 글',
                    author: 'Following',
                    authorId: 31,
                    authorHandle: 'following',
                    teamId: 'HH',
                    team: 'HH',
                    teamColor: 'HH',
                    createdAt: now,
                    updatedAt: now,
                    comments: 0,
                    likes: 2,
                    likeCount: 2,
                    commentCount: 0,
                    bookmarkCount: 0,
                    repostCount: 0,
                    views: 3,
                    liked: false,
                    likedByUser: false,
                    bookmarked: false,
                    isBookmarked: false,
                    repostedByMe: false,
                    repostType: undefined,
                    postType: 'NORMAL',
                    isOwner: false,
                    isHot: false,
                    images: [],
                    imageUrls: [],
                }],
                last: true,
                totalPages: 1,
                totalElements: 1,
                size: 20,
                number: 0,
            },
        }).as('getFollowingPosts');

        cy.intercept('GET', '**/api/cheer/posts/*/comments*', {
            statusCode: 200,
            body: { content: [], totalElements: 0, totalPages: 1, last: true, size: 20, number: 0 },
        });

        cy.visit('/notice', {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_USER');
            },
        });
        cy.wait('@getNoticePosts');
        cy.contains('공지 글').should('be.visible');

        cy.visit('/cheer');
        cy.wait('@getAllPosts');
        cy.contains('전체 탭 글').should('be.visible');

        cy.contains('button', '인기').click();
        cy.wait('@getHotPosts');
        cy.contains('인기 탭 글').should('be.visible');

        cy.contains('button', '팔로우').click();
        cy.wait('@getFollowingPosts');
        cy.contains('팔로우 탭 글').should('be.visible');

        cy.contains('button', '전체').click();
        cy.wait('@getAllPosts');
        cy.contains('전체 탭 글').should('be.visible');
    });
});
