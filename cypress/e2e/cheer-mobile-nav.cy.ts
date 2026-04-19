/// <reference types="cypress" />

const authToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkNoZWVyVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.fake-signature';

const seedLoggedInUser = (win: Window) => {
  win.localStorage.setItem(
    'auth-storage',
    JSON.stringify({
      state: {
        user: {
          id: 123,
          email: 'cheer@example.com',
          name: 'CheerUser',
          handle: 'cheeruser',
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
    }),
  );
  win.localStorage.setItem('accessToken', authToken);
  win.localStorage.setItem('auth-bootstrap-hint', '1');
  win.localStorage.setItem('auth-bootstrap-meta', JSON.stringify({
    version: 1,
    lastSuccessAt: Date.now(),
    lastFailureAt: null,
  }));
  win.localStorage.setItem('bega_has_visited', 'true');
  win.localStorage.setItem('bega_dont_show_guide', 'true');
  win.sessionStorage.setItem('cypress:skip-public-auth-bootstrap', '1');
};

const makePost = () => ({
  id: 1,
  content: '모바일 하단 네비 확인용 게시글',
  author: 'CheerUser',
  authorId: 123,
  authorHandle: 'cheeruser',
  teamId: 'HH',
  team: 'HH',
  authorTeamId: 'HH',
  timeAgo: '방금 전',
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
  isOwner: true,
  isHot: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  images: [],
  imageUrls: [],
});

const pageResponse = (content: unknown[]) => ({
  content,
  last: true,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  size: 20,
  number: 0,
});

describe('Cheer mobile bottom navigation', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
    cy.intercept('GET', '**/api/cheer/posts/hot*', {
      statusCode: 200,
      body: pageResponse([]),
    }).as('getHotPosts');
    cy.intercept('GET', '**/api/cheer/posts?*', {
      statusCode: 200,
      body: pageResponse([makePost()]),
    }).as('getPosts');
    cy.intercept('GET', '**/api/cheer/bookmarks*', {
      statusCode: 200,
      body: pageResponse([]),
    }).as('getBookmarks');
  });

  it('uses one integrated mobile nav on the Cheer feed', () => {
    cy.visit('/cheer', {
      onBeforeLoad: seedLoggedInUser,
    });
    cy.wait('@getPosts');

    cy.get('[data-testid="cheer-mobile-bottom-nav"]').should('be.visible');
    cy.get('button[aria-label="글쓰기"]').should('have.length', 1);
    cy.get('[data-testid="cheer-bottom-nav-team"]')
      .should('have.attr', 'aria-current', 'page')
      .and(($button) => {
        const rect = $button[0].getBoundingClientRect();

        expect(rect.height, 'team nav target height').to.be.at.least(44);
      });
  });

  it('keeps the same nav and only marks bookmarks active on the bookmarks page', () => {
    cy.visit('/cheer/bookmarks', {
      onBeforeLoad: seedLoggedInUser,
    });
    cy.wait('@getBookmarks');

    cy.get('[data-testid="cheer-mobile-bottom-nav"]').should('be.visible');
    cy.get('[data-testid="cheer-bottom-nav-bookmarks"]').should('have.attr', 'aria-current', 'page');
    cy.get('[data-testid="cheer-bottom-nav-team"]').should('not.have.attr', 'aria-current');
    cy.get('button[aria-label="글쓰기"]').click();
    cy.location('pathname').should('eq', '/cheer/write');
  });
});
