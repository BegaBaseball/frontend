/// <reference types="cypress" />

import {
    DEFAULT_CYPRESS_AUTH_TOKEN,
    seedCypressAuthState,
    type CypressAuthUser,
} from '../support/auth';

const authUser: CypressAuthUser = {
    id: 123,
    email: 'test@example.com',
    name: 'TestUser',
    handle: '@testuser',
    favoriteTeam: 'HH',
    role: 'ROLE_USER',
    hasPassword: true,
    profileImageUrl: null,
};

const seedAuth = (win: Window) => {
    seedCypressAuthState(win, authUser, DEFAULT_CYPRESS_AUTH_TOKEN);
};

const cheerPost = {
    id: 9901,
    content: '마지막 페이지 단건 응원글',
    author: '테스트',
    authorId: 123,
    authorHandle: 'testuser',
    teamId: 'HH',
    team: 'HH',
    teamColor: 'HH',
    createdAt: '2026-07-06T12:00:00.000Z',
    updatedAt: '2026-07-06T12:00:00.000Z',
    comments: 0,
    likes: 0,
    likeCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    repostCount: 0,
    views: 1,
    liked: false,
    bookmarked: false,
    isBookmarked: false,
    isOwner: true,
    repostedByMe: false,
    isHot: false,
    postType: 'NORMAL',
    imageUrls: [],
};

const springLastPage = (content: unknown[], page = 0) => ({
    content,
    page: {
        size: 20,
        number: page,
        totalElements: content.length,
        totalPages: content.length > 0 ? 1 : 0,
    },
});

describe('Cheer pagination end state', () => {
    it('응원석 피드가 Spring page 메타 마지막 페이지에서 하단 로더를 숨긴다', () => {
        cy.mockAPI();

        let nextPageRequests = 0;
        cy.intercept('GET', /\/api\/cheer\/posts(?:\?|$)/, (req) => {
            const url = new URL(req.url);
            const page = Number(url.searchParams.get('page') || '0');
            if (page > 0) {
                nextPageRequests += 1;
            }
            req.alias = `getCheerPostsLastPage${page}`;
            req.reply({
                statusCode: 200,
                body: springLastPage([cheerPost], page),
            });
        });

        cy.intercept('GET', '**/api/cheer/posts/changes*', {
            statusCode: 200,
            body: { newCount: 0, latestId: null },
        });

        cy.visit('/cheer', { onBeforeLoad: seedAuth });

        cy.wait('@getCheerPostsLastPage0');
        cy.contains('마지막 페이지 단건 응원글').should('be.visible');
        cy.get('[data-testid="cheer-feed-next-loader"]')
            .should('have.attr', 'aria-hidden', 'true')
            .and('not.be.visible')
            .contains('불러오는 중...')
            .should('not.be.visible');
        cy.scrollTo('bottom');
        cy.wait(500).then(() => {
            expect(nextPageRequests).to.eq(0);
        });
    });

    it('공개 프로필 작성글이 Spring page 메타 마지막 페이지에서 하단 스피너를 숨긴다', () => {
        cy.mockAPI();
        cy.mockPublicFollowCounts('@slug', {
            followerCount: 0,
            followingCount: 0,
            isFollowedByMe: false,
            notifyNewPosts: false,
        });

        let nextPageRequests = 0;
        const profilePost = {
            ...cheerPost,
            id: 9902,
            content: '프로필 마지막 페이지 단건 응원글',
            author: 'Slug User',
            authorId: 456,
            authorHandle: 'slug',
            isOwner: false,
        };

        cy.intercept('GET', /\/api\/users\/profile\/(?:%40)?slug$/, {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    id: 456,
                    name: 'Slug User',
                    handle: '@slug',
                    favoriteTeam: 'HH',
                    cheerPoints: 0,
                    profileImageUrl: null,
                    bio: '프로필 테스트',
                },
            },
        }).as('getPublicProfileSlug');

        cy.intercept('GET', '**/api/cheer/user/slug/posts*', (req) => {
            const url = new URL(req.url);
            const page = Number(url.searchParams.get('page') || '0');
            if (page > 0) {
                nextPageRequests += 1;
            }
            req.alias = `getProfilePostsLastPage${page}`;
            req.reply({
                statusCode: 200,
                body: springLastPage([profilePost], page),
            });
        });

        cy.visit('/profile/@slug', { onBeforeLoad: seedAuth });

        cy.wait('@getPublicProfileSlug');
        cy.wait('@getProfilePostsLastPage0');
        cy.contains('프로필 마지막 페이지 단건 응원글').should('be.visible');
        cy.get('[data-testid="user-profile-posts-next-loader"]').should('not.exist');
        cy.contains('모든 응원을 확인했습니다').should('be.visible');
        cy.scrollTo('bottom');
        cy.wait(500).then(() => {
            expect(nextPageRequests).to.eq(0);
        });
    });
});
