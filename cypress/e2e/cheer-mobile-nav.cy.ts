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

const assertMinTarget = (
  subject: JQuery<HTMLElement>,
  label: string,
  options: { minWidth?: number; minHeight?: number } = {},
) => {
  const rect = subject[0].getBoundingClientRect();
  const minWidth = options.minWidth ?? 44;
  const minHeight = options.minHeight ?? 44;

  expect(rect.width, `${label} width`).to.be.at.least(minWidth);
  expect(rect.height, `${label} height`).to.be.at.least(minHeight);
};

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
    cy.document().its('documentElement.scrollWidth').should('be.lte', 390);
    cy.get('[data-testid="cheer-bottom-nav-home"]').should(($button) => assertMinTarget($button, 'home nav'));
    cy.get('[data-testid="cheer-bottom-nav-team"]')
      .should('have.attr', 'aria-current', 'page')
      .and(($button) => assertMinTarget($button, 'team nav'));
    cy.get('[data-testid="cheer-bottom-nav-write"]').should(($button) => assertMinTarget($button, 'write nav'));
    cy.get('[data-testid="cheer-bottom-nav-bookmarks"]').should(($button) => assertMinTarget($button, 'bookmarks nav'));
    cy.get('[data-testid="cheer-bottom-nav-profile"]').should(($button) => assertMinTarget($button, 'profile nav'));
    cy.contains('button', '전체').should(($button) => assertMinTarget($button, 'feed tab', { minHeight: 36 }));
    cy.get('button[aria-label="이미지 첨부"]').should(($button) => assertMinTarget($button, 'image attach'));
    cy.get('[data-testid="write-post-btn"]').should(($button) => assertMinTarget($button, 'inline write button'));
    cy.get('[data-testid="cheer-post-card"]').first().within(() => {
      cy.get('button[aria-label="게시글 옵션"]').should(($button) => assertMinTarget($button, 'post options'));
      cy.get('button[aria-label*="댓글"]').first().should(($button) => assertMinTarget($button, 'comment action'));
      cy.get('button[aria-label*="좋아요"]').first().should(($button) => assertMinTarget($button, 'like action'));
      cy.get('button[aria-label="북마크"]').first().should(($button) => assertMinTarget($button, 'bookmark action'));
    });
  });

  it('searches cheer posts with the existing search API', () => {
    const searchResult = {
      ...makePost(),
      id: 22,
      content: '해시태그 검색 결과 게시글',
    };
    cy.intercept('GET', '**/api/cheer/posts/search*', (req) => {
      expect(req.query.q).to.eq('직관인증');
      req.reply({ statusCode: 200, body: pageResponse([searchResult]) });
    }).as('searchPosts');

    cy.visit('/cheer', {
      onBeforeLoad: seedLoggedInUser,
    });
    cy.wait('@getPosts');

    cy.get('input[aria-label="응원글 검색"]').type('직관인증{enter}');
    cy.wait('@searchPosts');
    cy.location('search').should('include', 'q=%EC%A7%81%EA%B4%80%EC%9D%B8%EC%A6%9D');
    cy.contains(searchResult.content).should('be.visible');
    cy.get('button[aria-label="검색어 지우기"]').click();
    cy.contains(makePost().content).should('be.visible');
    cy.get('[data-testid="cheer-recent-searches"]').should('be.visible').and('contain.text', '직관인증');
  });

  it('opens the live surface without showing the post composer', () => {
    cy.visit('/cheer', {
      onBeforeLoad: seedLoggedInUser,
    });
    cy.wait('@getPosts');

    cy.contains('button', '라이브').click();
    cy.wait('@getHomeSchedule');
    cy.location('search').should('include', 'tab=live');
    cy.contains('오늘 진행 중인 경기가 없습니다.').should('be.visible');
    cy.get('textarea[placeholder*="응원"]').should('not.exist');
  });

  it('keeps the same nav and only marks bookmarks active on the bookmarks page', () => {
    cy.visit('/cheer/bookmarks', {
      onBeforeLoad: seedLoggedInUser,
    });
    cy.wait('@getBookmarks');

    cy.get('[data-testid="cheer-mobile-bottom-nav"]').should('be.visible');
    cy.get('[data-testid="cheer-bottom-nav-bookmarks"]').should('have.attr', 'aria-current', 'page');
    cy.get('[data-testid="cheer-bottom-nav-team"]').should('not.have.attr', 'aria-current');
    cy.get('[data-testid="cheer-bottom-nav-write"]').should(($button) => assertMinTarget($button, 'bookmarks write nav'));
    cy.get('button[aria-label="글쓰기"]').click();
    cy.location('pathname').should('eq', '/cheer/write');
  });
});
