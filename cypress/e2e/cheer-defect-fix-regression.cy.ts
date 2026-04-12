/// <reference types="cypress" />

describe('Cheer 커뮤니티 결함 해결 검증', () => {
    const authToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3RVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const actualAvatarUrl = 'https://avatars.test/cheer-user.svg';
    const actualAvatarSvg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1d4ed8"/><stop offset="100%" stop-color="#2563eb"/></linearGradient></defs><rect width="640" height="640" fill="url(#bg)"/><circle cx="320" cy="250" r="120" fill="#f8fafc" fill-opacity="0.92"/><circle cx="278" cy="226" r="16" fill="#0f172a"/><circle cx="362" cy="226" r="16" fill="#0f172a"/><path d="M258 308c18 24 42 36 62 36s44-12 62-36" fill="none" stroke="#0f172a" stroke-width="18" stroke-linecap="round"/><path d="M164 536c28-96 102-152 156-152s128 56 156 152" fill="#e2e8f0" fill-opacity="0.92"/></svg>';
    const expectSquareSize = ($element: JQuery<HTMLElement>, size: number) => {
        const { width, height } = $element[0].getBoundingClientRect();

        expect(Math.round(width)).to.eq(size);
        expect(Math.round(height)).to.eq(size);
    };
    const seedAuthState = (
        win: Window,
        role: 'ROLE_USER' | 'ROLE_ADMIN' = 'ROLE_USER',
        profileImageUrl: string | null = null,
    ) => {
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
                        profileImageUrl,
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
    const stubAvatarAsset = (avatarUrl: string = actualAvatarUrl, avatarSvg: string = actualAvatarSvg) => {
        cy.intercept('GET', avatarUrl, {
            statusCode: 200,
            headers: {
                'content-type': 'image/svg+xml',
                'cache-control': 'public, max-age=3600',
            },
            body: avatarSvg,
        }).as('getStubAvatarAsset');
    };
    const stubAuthProfile = (
        role: 'ROLE_USER' | 'ROLE_ADMIN' = 'ROLE_USER',
        profileImageUrl: string | null = null,
    ) => {
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
                    profileImageUrl,
                    hasPassword: true,
                    policyConsentRequired: false,
                    policyConsentNoticeRequired: false,
                    missingPolicyTypes: [],
                },
            },
        }).as('getMeAnyPath');
    };
    const buildGuestCheerDetail = (postId: number) => ({
        id: postId,
        content: '비로그인 상세 액션 복귀 점검',
        author: 'writer',
        authorId: 55,
        authorHandle: 'writer',
        teamId: 'HH',
        team: 'HH',
        teamColor: 'HH',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: 1,
        commentCount: 1,
        likes: 3,
        likeCount: 3,
        bookmarkCount: 1,
        repostCount: 2,
        views: 10,
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
    });

    const stubGuestCheerDetailRoute = (postId: number) => {
        cy.intercept('GET', `**/api/cheer/posts/${postId}`, {
            statusCode: 200,
            body: buildGuestCheerDetail(postId),
        }).as('getGuestCheerDetail');

        cy.intercept('GET', `**/api/cheer/posts/${postId}/comments*`, {
            statusCode: 200,
            body: {
                content: [],
                totalElements: 0,
                totalPages: 1,
                last: true,
                size: 20,
                number: 0,
            },
        }).as('getGuestCheerComments');
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

        cy.contains('원글 본문').should('be.visible');
        cy.get('button[aria-label^="좋아요"]').first().as('likeButton');
        cy.get('button[aria-label*="리포스트"]').first().as('repostButton');
        cy.get('button[aria-label^="북마크"]').first().as('bookmarkButton');

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

    it('4-1) 일반 상세 좋아요는 현재 글 id로 요청되고 같은 글 카운트만 갱신한다', () => {
        cy.mockAPI();
        stubAuthProfile('ROLE_USER');

        const postId = 213;
        const now = new Date().toISOString();

        cy.intercept('GET', `**/api/cheer/posts/${postId}`, {
            statusCode: 200,
            body: {
                id: postId,
                content: '상세 좋아요 대상 글',
                author: 'writer',
                authorId: 55,
                authorHandle: 'writer',
                teamId: 'HH',
                team: 'HH',
                teamColor: 'HH',
                createdAt: now,
                updatedAt: now,
                comments: 0,
                commentCount: 0,
                likes: 0,
                likeCount: 0,
                bookmarkCount: 0,
                repostCount: 0,
                views: 10,
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
        }).as('getCheerDetail');

        cy.intercept('GET', `**/api/cheer/posts/${postId}/comments*`, {
            statusCode: 200,
            body: {
                content: [],
                totalElements: 0,
                totalPages: 1,
                last: true,
                size: 20,
                number: 0,
            },
        }).as('getCheerComments');

        cy.intercept('POST', `**/api/cheer/posts/${postId}/like`, (req) => {
            req.alias = 'toggleLikeDetail';
            req.reply({
                statusCode: 200,
                body: { liked: true, likes: 1 },
            });
        });

        cy.visit(`/cheer/${postId}`, {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_USER');
            },
        });

        cy.wait('@getCheerDetail');
        cy.wait('@getCheerComments');
        cy.get('button[aria-label^="좋아요"]').first().as('likeButton');

        cy.get('@likeButton').should('contain', '0');
        cy.get('@likeButton').click();
        cy.wait('@toggleLikeDetail')
            .its('request.url')
            .should('include', `/api/cheer/posts/${postId}/like`);
        cy.get('@likeButton')
            .should('have.class', 'bg-rose-50')
            .and('contain', '1')
            .invoke('attr', 'aria-label')
            .should('include', '1');
    });

    it('4-2) 이미지 카드 좋아요는 현재 카드만 갱신하고 아래 카드 카운트는 유지한다', () => {
        cy.mockAPI();
        stubAuthProfile('ROLE_USER');

        const imageDataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
        const now = new Date().toISOString();

        cy.intercept('GET', '**/api/cheer/posts/hot*', {
            statusCode: 200,
            body: {
                content: [],
                last: true,
                totalPages: 1,
                totalElements: 0,
                size: 20,
                number: 0,
            },
        }).as('getHotPosts');

        cy.intercept('GET', '**/api/cheer/posts*', {
            statusCode: 200,
            body: {
                content: [
                    {
                        id: 213,
                        content: '이미지 대상 게시글',
                        author: 'writer',
                        authorId: 55,
                        authorHandle: 'writer',
                        teamId: 'HH',
                        team: 'HH',
                        teamColor: 'HH',
                        createdAt: now,
                        updatedAt: now,
                        comments: 0,
                        commentCount: 0,
                        likes: 0,
                        likeCount: 0,
                        bookmarkCount: 0,
                        repostCount: 0,
                        views: 10,
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
                        imageUrls: [imageDataUrl],
                    },
                    {
                        id: 212,
                        content: '아래 카드 카운트 유지',
                        author: 'writer2',
                        authorId: 56,
                        authorHandle: 'writer2',
                        teamId: 'HH',
                        team: 'HH',
                        teamColor: 'HH',
                        createdAt: now,
                        updatedAt: now,
                        comments: 0,
                        commentCount: 0,
                        likes: 6,
                        likeCount: 6,
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
                    },
                ],
                last: true,
                totalPages: 1,
                totalElements: 2,
                size: 20,
                number: 0,
            },
        }).as('getCheerPosts');

        cy.intercept('POST', '**/api/cheer/posts/213/like', (req) => {
            req.alias = 'toggleImagePostLike';
            req.reply({
                statusCode: 200,
                body: { liked: true, likes: 1 },
            });
        });

        cy.visit('/cheer', {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_USER');
            },
        });

        cy.wait('@getCheerPosts');
        cy.wait('@getHotPosts');

        cy.contains('이미지 대상 게시글').closest('div.group').as('imageCard');
        cy.contains('아래 카드 카운트 유지').closest('div.group').as('neighborCard');

        cy.get('@imageCard').find('button[aria-label*="좋아요"]').first().as('imageLikeButton');
        cy.get('@neighborCard').find('button[aria-label*="좋아요"]').first().as('neighborLikeButton');

        cy.get('@imageLikeButton').invoke('attr', 'aria-label').should('include', '0');
        cy.get('@neighborLikeButton').invoke('attr', 'aria-label').should('include', '6');

        cy.get('@imageLikeButton').click();
        cy.wait('@toggleImagePostLike')
            .its('request.url')
            .should('include', '/api/cheer/posts/213/like');

        cy.get('@imageLikeButton')
            .should('have.attr', 'aria-pressed', 'true')
            .invoke('attr', 'aria-label')
            .should('include', '1');
        cy.get('@neighborLikeButton')
            .invoke('attr', 'aria-label')
            .should('include', '6');
    });

    it('5) 댓글 답글 CTA를 숨긴 상태를 점검한다', () => {
        cy.mockAPI();
        stubAuthProfile('ROLE_USER');

        const postId = 77;
        const now = new Date().toISOString();

        cy.intercept('GET', `**/api/cheer/posts/${postId}`, {
            statusCode: 200,
            body: {
                id: postId,
                content: '댓글 답글 UX 점검용 본문',
                author: 'writer',
                authorId: 55,
                authorHandle: 'writer',
                teamId: 'HH',
                team: 'HH',
                teamColor: 'HH',
                createdAt: now,
                updatedAt: now,
                comments: 1,
                commentCount: 1,
                likes: 3,
                likeCount: 3,
                bookmarkCount: 0,
                repostCount: 0,
                views: 10,
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
        }).as('getCheerDetail');

        cy.intercept('GET', `**/api/cheer/posts/${postId}/comments*`, {
            statusCode: 200,
            body: {
                content: [
                    {
                        id: 501,
                        content: '첫 댓글입니다.',
                        author: 'commenter',
                        authorId: 88,
                        authorHandle: 'commenter',
                        authorProfileImageUrl: null,
                        createdAt: now,
                        updatedAt: now,
                        timeAgo: '방금 전',
                        likeCount: 2,
                        likedByMe: false,
                        replies: [],
                    },
                ],
                totalElements: 1,
                totalPages: 1,
                last: true,
                size: 20,
                number: 0,
            },
        }).as('getCheerComments');

        cy.visit(`/cheer/${postId}`, {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_USER');
            },
        });

        cy.wait('@getCheerDetail');
        cy.wait('@getCheerComments');

        cy.contains('첫 댓글입니다.').should('be.visible');
        cy.contains('답글 달기').should('not.exist');
    });

    it('5-1) 댓글 목록은 기본 5개만 노출하고 더보기로 확장한다', () => {
        cy.mockAPI();
        stubAuthProfile('ROLE_USER');

        const postId = 86;
        const now = new Date().toISOString();
        const comments = Array.from({ length: 8 }, (_, index) => ({
            id: 1000 + index,
            content: `확인용 댓글 ${index + 1}`,
            author: `commenter-${index + 1}`,
            authorId: 200 + index,
            authorHandle: `commenter-${index + 1}`,
            authorProfileImageUrl: null,
            createdAt: now,
            updatedAt: now,
            timeAgo: '방금 전',
            likeCount: 0,
            likes: 0,
            likedByMe: false,
            replies: [],
        }));

        cy.intercept('GET', `**/api/cheer/posts/${postId}`, {
            statusCode: 200,
            body: {
                id: postId,
                content: '댓글 더보기 점검용 본문',
                author: 'writer',
                authorId: 55,
                authorHandle: 'writer',
                teamId: 'HH',
                team: 'HH',
                teamColor: 'HH',
                createdAt: now,
                updatedAt: now,
                comments: comments.length,
                commentCount: comments.length,
                likes: 3,
                likeCount: 3,
                bookmarkCount: 0,
                repostCount: 0,
                views: 10,
                liked: false,
                likedByMe: false,
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
        }).as('getCheerDetail');

        cy.intercept('GET', `**/api/cheer/posts/${postId}/comments*`, {
            statusCode: 200,
            body: {
                content: comments,
                totalElements: comments.length,
                totalPages: 1,
                last: true,
                size: 20,
                number: 0,
            },
        }).as('getCheerComments');

        cy.visit(`/cheer/${postId}`, {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_USER');
            },
        });

        cy.wait('@getCheerDetail');
        cy.wait('@getCheerComments');
        comments.slice(0, 5).forEach((comment) => {
            cy.contains(comment.content).should('be.visible');
        });
        comments.slice(5).forEach((comment) => {
            cy.contains(comment.content).should('not.exist');
        });

        cy.get('[data-testid="cheer-comments-show-more"]')
            .should('be.visible')
            .and('have.text', '댓글 더보기')
            .click();

        comments.forEach((comment) => {
            cy.contains(comment.content).should('be.visible');
        });

        cy.get('[data-testid="cheer-comments-show-more"]')
            .should('have.text', '댓글 접기')
            .click();

        comments.slice(0, 5).forEach((comment) => {
            cy.contains(comment.content).should('be.visible');
        });
        comments.slice(5).forEach((comment) => {
            cy.contains(comment.content).should('not.exist');
        });
    });

    it('5-2) 응원 현황은 모바일에서 기본 접힘/열림을 전환한다', () => {
        cy.mockAPI();
        stubAuthProfile('ROLE_USER');

        const postId = 87;
        const now = new Date().toISOString();

        cy.intercept('GET', `**/api/cheer/posts/${postId}`, {
            statusCode: 200,
            body: {
                id: postId,
                content: '응원 현황 토글 점검용 본문',
                author: 'writer',
                authorId: 55,
                authorHandle: 'writer',
                teamId: 'HH',
                team: 'HH',
                teamColor: 'HH',
                createdAt: now,
                updatedAt: now,
                comments: 0,
                commentCount: 0,
                likes: 3,
                likeCount: 3,
                bookmarkCount: 0,
                repostCount: 0,
                views: 10,
                liked: false,
                likedByMe: false,
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
        }).as('getCheerDetail');

        cy.intercept('GET', `**/api/cheer/posts/${postId}/comments*`, {
            statusCode: 200,
            body: {
                content: [],
                totalElements: 0,
                totalPages: 1,
                last: true,
                size: 20,
                number: 0,
            },
        }).as('getCheerComments');

        cy.viewport('iphone-6');
        cy.visit(`/cheer/${postId}`, {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_USER');
            },
        });

        cy.wait('@getCheerDetail');
        cy.wait('@getCheerComments');
        cy.get('button[aria-label="응원 현황 토글"]').as('statsToggle');
        cy.get('#cheer-detail-stats').should('not.be.visible');
        cy.get('@statsToggle').click();
        cy.get('#cheer-detail-stats').should('be.visible');
        cy.get('@statsToggle').click();
        cy.get('#cheer-detail-stats').should('not.be.visible');
    });

    it('5-3) 댓글 목록 아바타는 본문/답글 모두 SVG 렌더 경로를 유지한다', () => {
        cy.mockAPI();
        stubAvatarAsset();
        stubAuthProfile('ROLE_USER', actualAvatarUrl);

        const postId = 88;
        const now = new Date().toISOString();

        cy.intercept('GET', `**/api/cheer/posts/${postId}`, {
            statusCode: 200,
            body: {
                id: postId,
                content: '댓글 아바타 렌더 경로 점검용 본문',
                author: 'writer',
                authorId: 55,
                authorHandle: 'writer',
                authorProfileImageUrl: actualAvatarUrl,
                teamId: 'HH',
                team: 'HH',
                teamColor: 'HH',
                createdAt: now,
                updatedAt: now,
                comments: 2,
                commentCount: 2,
                likes: 3,
                likeCount: 3,
                bookmarkCount: 0,
                repostCount: 0,
                views: 10,
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
        }).as('getCommentAvatarDetail');

        cy.intercept('GET', `**/api/cheer/posts/${postId}/comments*`, {
            statusCode: 200,
            body: {
                content: [
                    {
                        id: 701,
                        content: '실제 이미지가 있는 본문 댓글입니다.',
                        author: 'commenter',
                        authorId: 88,
                        authorHandle: 'commenter',
                        authorProfileImageUrl: actualAvatarUrl,
                        createdAt: now,
                        updatedAt: now,
                        timeAgo: '방금 전',
                        likeCount: 2,
                        likedByMe: false,
                        replies: [
                            {
                                id: 702,
                                content: '실제 이미지가 있는 답글입니다.',
                                author: 'replier',
                                authorId: 89,
                                authorHandle: 'replier',
                                authorProfileImageUrl: actualAvatarUrl,
                                createdAt: now,
                                updatedAt: now,
                                timeAgo: '방금 전',
                                likeCount: 0,
                                likedByMe: false,
                                replies: [],
                            },
                        ],
                    },
                ],
                totalElements: 2,
                totalPages: 1,
                last: true,
                size: 20,
                number: 0,
            },
        }).as('getCommentAvatarComments');

        cy.visit(`/cheer/${postId}`, {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_USER', actualAvatarUrl);
            },
        });

        cy.wait('@getMeAnyPath');
        cy.wait('@getCommentAvatarDetail');
        cy.wait('@getCommentAvatarComments');

        cy.get('[role="list"][aria-label="댓글 목록"]').within(() => {
            cy.get('[data-testid="profile-avatar-frame"]').eq(0)
                .should('have.class', 'p-0')
                .and('have.class', 'bg-transparent')
                .and(($frame) => {
                    expectSquareSize($frame, 48);
                })
                .find('[data-testid="profile-avatar-image"]').first()
                .should(($surface) => {
                    expect($surface).to.have.class('w-full');
                    expect($surface).to.have.class('h-full');
                    expect($surface.prop('tagName').toLowerCase()).to.eq('svg');
                });

            cy.get('[data-testid="profile-avatar-frame"]').eq(1)
                .should('have.class', 'p-0')
                .and('have.class', 'bg-transparent')
                .and(($frame) => {
                    expectSquareSize($frame, 40);
                })
                .find('[data-testid="profile-avatar-image"]').first()
                .should(($surface) => {
                    expect($surface).to.have.class('w-full');
                    expect($surface).to.have.class('h-full');
                    expect($surface.prop('tagName').toLowerCase()).to.eq('svg');
                });
        });
    });

    it('6) 공지/인기/팔로우 탭 회귀 동작을 점검한다', () => {
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

    it('7) 팔로우 탭 로그인 CTA가 현재 탭 redirect를 유지한다', () => {
        cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 401 });
        cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 });

        cy.intercept('GET', '**/api/cheer/posts*', {
            statusCode: 200,
            body: {
                content: [
                    {
                        id: 12,
                        content: '비로그인 피드 샘플',
                        author: 'guest',
                        authorId: 9,
                        authorHandle: 'guest',
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
                        views: 1,
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
        }).as('getGuestCheerPosts');

        cy.visit('/cheer', {
            onBeforeLoad: (win) => {
                win.localStorage.clear();
                win.sessionStorage.clear();
            },
        });

        cy.wait('@getGuestCheerPosts');
        cy.contains('button', '팔로우').click();
        cy.location('search').should('eq', '?tab=following');
        cy.contains('팔로우한 유저의 글을 보려면 로그인해주세요.').should('be.visible');
        cy.contains('button', '로그인하기').click();
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', '?redirect=%2Fcheer%3Ftab%3Dfollowing');
    });

    it('8) 댓글 로그인 CTA가 현재 상세 경로 redirect를 유지한다', () => {
        cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 401 });
        cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 });

        const postId = 78;
        const now = new Date().toISOString();

        cy.intercept('GET', `**/api/cheer/posts/${postId}`, {
            statusCode: 200,
            body: {
                id: postId,
                content: '비로그인 댓글 경로 복귀 점검',
                author: 'writer',
                authorId: 55,
                authorHandle: 'writer',
                teamId: 'HH',
                team: 'HH',
                teamColor: 'HH',
                createdAt: now,
                updatedAt: now,
                comments: 1,
                commentCount: 1,
                likes: 3,
                likeCount: 3,
                bookmarkCount: 0,
                repostCount: 0,
                views: 10,
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
        }).as('getGuestCheerDetail');

        cy.intercept('GET', `**/api/cheer/posts/${postId}/comments*`, {
            statusCode: 200,
            body: {
                content: [],
                totalElements: 0,
                totalPages: 1,
                last: true,
                size: 20,
                number: 0,
            },
        }).as('getGuestCheerComments');

        cy.visit(`/cheer/${postId}`, {
            onBeforeLoad: (win) => {
                win.localStorage.clear();
                win.sessionStorage.clear();
            },
        });

        cy.wait('@getGuestCheerDetail');
        cy.wait('@getGuestCheerComments');
        cy.get('#cheer-comments-section').scrollIntoView();
        cy.contains('댓글과 좋아요는 로그인 후 이용할 수 있습니다.').should('be.visible');
        cy.contains('button', '로그인하고 참여하기').click();
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', `?redirect=%2Fcheer%2F${postId}`);
    });

    it('8-1) 상세 상단 게스트 액션이 현재 상세 경로 redirect를 유지한다', () => {
        cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 401 });
        cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 });

        const postId = 79;
        const expectedRedirect = `?redirect=%2Fcheer%2F${postId}`;
        stubGuestCheerDetailRoute(postId);

        [
            'button[aria-label^="좋아요 "]',
            'button[aria-label^="리포스트 "]',
            'button[aria-label^="북마크 "]',
        ].forEach((selector) => {
            cy.visit(`/cheer/${postId}`, {
                onBeforeLoad: (win) => {
                    win.localStorage.clear();
                    win.sessionStorage.clear();
                },
            });

            cy.wait('@getGuestCheerDetail');
            cy.wait('@getGuestCheerComments');
            cy.get(selector).first().click();
            cy.location('pathname').should('eq', '/login');
            cy.location('search').should('eq', expectedRedirect);
        });
    });

    it('8-2) 상세 초기 로드 실패는 친화형 문구와 재시도만 노출한다', () => {
        cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 401 });
        cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 });

        const postId = 80;
        let detailRequestCount = 0;

        cy.intercept('GET', `**/api/cheer/posts/${postId}`, (req) => {
            detailRequestCount += 1;

            if (detailRequestCount === 1) {
                req.reply({
                    statusCode: 500,
                    body: {
                        message: 'Request failed with status code 500',
                    },
                });
                return;
            }

            req.reply({
                statusCode: 200,
                body: {
                    ...buildGuestCheerDetail(postId),
                    content: '재시도 후 정상 로드된 응원글',
                },
            });
        }).as('getCheerDetailWithRetry');

        cy.intercept('GET', `**/api/cheer/posts/${postId}/comments*`, {
            statusCode: 200,
            body: {
                content: [],
                totalElements: 0,
                totalPages: 1,
                last: true,
                size: 20,
                number: 0,
            },
        }).as('getCheerCommentsAfterRetry');

        cy.visit(`/cheer/${postId}`, {
            onBeforeLoad: (win) => {
                win.localStorage.clear();
                win.sessionStorage.clear();
            },
        });

        cy.wait('@getCheerDetailWithRetry');
        cy.contains('게시글을 불러오지 못했습니다.').should('be.visible');
        cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
        cy.contains('Request failed with status code 500').should('not.exist');
        cy.contains('button', '다시 시도').click();

        cy.wait('@getCheerDetailWithRetry');
        cy.wait('@getCheerCommentsAfterRetry');
        cy.contains('재시도 후 정상 로드된 응원글').should('be.visible');
    });

    it('9) 비로그인 상태에서 게시하기를 누르면 작성 경로로 복귀하도록 로그인 이동한다', () => {
        cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 401 });
        cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 });

        const postBody = {
            content: [
                {
                    id: 31,
                    content: '비로그인 작성 진입 점검용 글',
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
        };

        cy.intercept('GET', '**/api/cheer/posts/hot*', {
            statusCode: 200,
            body: postBody,
        }).as('getPopularPostsForWrite');

        cy.intercept('GET', '**/api/cheer/posts*', {
            statusCode: 200,
            body: postBody,
        }).as('getCheerPostsForWrite');

        cy.visit('/cheer', {
            onBeforeLoad: (win) => {
                win.localStorage.clear();
                win.sessionStorage.clear();
            },
        });

        cy.wait('@getCheerPostsForWrite');
        cy.contains('button', '인기').click();
        cy.wait('@getPopularPostsForWrite');
        cy.location('search').should('eq', '?tab=popular');
        cy.contains('button', '게시하기').should('be.visible').click();
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', '?redirect=%2Fcheer%2Fwrite%3Ftab%3Dpopular');
    });

    it('10) 비로그인 상태에서 /cheer/write 직접 진입 시 로그인 후 작성으로 복귀한다', () => {
        cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 401 });
        cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 });

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
        }).as('getWriteRoutePosts');

        cy.visit('/cheer/write?tab=following', {
            onBeforeLoad: (win) => {
                win.localStorage.clear();
                win.sessionStorage.clear();
            },
        });

        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', '?redirect=%2Fcheer%2Fwrite%3Ftab%3Dfollowing');
    });

    it('10-1) 작성 모달 제출 중 세션이 만료되면 현재 write 경로로 복귀 가능한 로그인으로 이동한다', () => {
        cy.mockAPI();
        stubAuthProfile('ROLE_USER');

        const emptyPostPage = {
            content: [],
            last: true,
            totalPages: 1,
            totalElements: 0,
            size: 20,
            number: 0,
        };

        cy.intercept('GET', '**/api/cheer/posts/hot*', {
            statusCode: 200,
            body: emptyPostPage,
        }).as('getPopularPostsForExpiredWrite');

        cy.intercept('GET', '**/api/cheer/posts*', {
            statusCode: 200,
            body: emptyPostPage,
        }).as('getCheerPostsForExpiredWrite');

        cy.intercept('POST', '**/api/auth/reissue*', {
            statusCode: 401,
            body: {
                message: 'Unauthorized',
            },
        }).as('reissueForExpiredCheerWrite');

        cy.intercept('POST', '**/api/cheer/posts', {
            statusCode: 401,
            body: {
                message: 'Unauthorized',
            },
        }).as('createCheerPostUnauthorized');

        cy.visit('/cheer/write?tab=popular', {
            onBeforeLoad: (win) => {
                seedAuthState(win);
            },
        });

        cy.wait('@getMeAnyPath');
        cy.wait('@getPopularPostsForExpiredWrite');
        cy.get('textarea[placeholder*="응원"]').filter(':visible').first().type('세션 만료 복귀 점검', { force: true });
        cy.get('[data-testid="write-post-btn"]').filter(':visible').first().click({ force: true });

        cy.wait('@createCheerPostUnauthorized');
        cy.get('@reissueForExpiredCheerWrite.all').should('have.length', 0);
        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('eq', '?redirect=%2Fcheer%2Fwrite%3Ftab%3Dpopular');
    });

    it('10-2) 상세 아바타 프레임과 댓글 입력 아바타 크기가 cheer 규격을 유지한다', () => {
        cy.mockAPI();
        stubAvatarAsset();
        stubAuthProfile('ROLE_USER', actualAvatarUrl);

        const postId = 135;
        const now = new Date().toISOString();

        cy.intercept('GET', `**/api/cheer/posts/${postId}`, {
            statusCode: 200,
            body: {
                id: postId,
                content: '아바타 프레임 회귀 점검용 본문',
                author: 'writer',
                authorId: 55,
                authorHandle: 'writer',
                authorProfileImageUrl: actualAvatarUrl,
                teamId: 'HH',
                team: 'HH',
                teamColor: 'HH',
                createdAt: now,
                updatedAt: now,
                comments: 0,
                commentCount: 0,
                likes: 3,
                likeCount: 3,
                bookmarkCount: 0,
                repostCount: 0,
                views: 10,
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
        }).as('getAvatarDetail');

        cy.intercept('GET', `**/api/cheer/posts/${postId}/comments*`, {
            statusCode: 200,
            body: {
                content: [],
                totalElements: 0,
                totalPages: 1,
                last: true,
                size: 20,
                number: 0,
            },
        }).as('getAvatarComments');

        cy.visit(`/cheer/${postId}`, {
            onBeforeLoad: (win) => {
                seedAuthState(win, 'ROLE_USER', actualAvatarUrl);
            },
        });

        cy.wait('@getMeAnyPath');
        cy.wait('@getAvatarDetail');
        cy.wait('@getAvatarComments');

        cy.get('[data-testid="profile-avatar-frame"]').eq(0)
            .should('have.class', 'p-0.5')
            .and('not.have.class', 'p-px')
            .and(($frame) => {
                expectSquareSize($frame, 48);
            })
            .find('[data-testid="profile-avatar-image"]').first()
            .should(($surface) => {
                expect($surface).to.have.class('w-full');
                expect($surface).to.have.class('h-full');
                expect($surface.prop('tagName').toLowerCase()).to.eq('svg');
            });

        cy.get('[data-testid="profile-avatar-frame"]').eq(1)
            .should('have.class', 'p-0.5')
            .and('not.have.class', 'p-px')
            .and(($frame) => {
                expectSquareSize($frame, 40);
            })
            .find('[data-testid="profile-avatar-image"]').first()
            .should(($surface) => {
                expect($surface).to.have.class('w-full');
                expect($surface).to.have.class('h-full');
                expect($surface.prop('tagName').toLowerCase()).to.eq('svg');
            });
    });

});
