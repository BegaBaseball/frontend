/// <reference types="cypress" />

const mockGuestSession = () => {
  cy.intercept('GET', '**/auth/mypage*', {
    statusCode: 401,
    body: { success: false, code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
  }).as('getGuestProfile');
  cy.intercept('**/auth/reissue*', {
    statusCode: 401,
    body: { success: false, code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
  }).as('guestReissue');
}

const pageResponse = (content: unknown[]) => ({
  content,
  last: true,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  size: 20,
  number: 0,
});

describe('page-by-page route coverage', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    mockGuestSession();
  });

  it('1. renders the terms page directly', () => {
    cy.visit('/terms');

    cy.get('h1').should('contain.text', '이용약관');
    cy.contains('제1조 (목적)').should('be.visible');
  });

  it('2. renders the privacy page directly', () => {
    cy.visit('/privacy');

    cy.get('h1').should('contain.text', '개인정보처리방침');
    cy.contains('개인정보').should('be.visible');
  });

  it('3. renders notice posts and opens the selected notice', () => {
    cy.intercept({ method: 'GET', pathname: '/api/cheer/posts' }, {
      statusCode: 200,
      body: pageResponse([
        {
          id: 501,
          teamId: 'HH',
          content: '공지 확인용 안내\n상세 내용',
          author: '운영팀',
          createdAt: '2026-07-01T00:00:00.000Z',
          postType: 'NOTICE',
          comments: 2,
          likes: 3,
        },
        {
          id: 502,
          teamId: 'LG',
          content: '일반 응원글은 공지 목록에서 제외',
          author: '사용자',
          createdAt: '2026-07-01T00:00:00.000Z',
          postType: 'NORMAL',
        },
      ]),
    }).as('getNoticePosts');

    cy.visit('/notice');
    cy.wait('@getNoticePosts');

    cy.get('h1').should('contain.text', '공지사항');
    cy.contains('공지 확인용 안내').should('be.visible').click();
    cy.contains('일반 응원글은 공지 목록에서 제외').should('not.exist');
    cy.location('pathname').should('eq', '/cheer/501');
  });

  it('4. shows the invalid account recovery state without a token', () => {
    cy.visit('/account/deletion/recovery');

    cy.get('[data-testid="account-recovery-status-panel"]')
      .should('have.attr', 'role', 'alert')
      .and('contain.text', '유효하지 않거나 만료된 복구 링크입니다.');
    cy.get('[data-testid="account-recovery-submit"]').should('not.exist');
  });

  it('5. loads and completes account recovery from a valid token', () => {
    cy.intercept({ method: 'GET', pathname: '/api/auth/account/deletion/recovery' }, {
      statusCode: 200,
      body: {
        success: true,
        data: { scheduledFor: '2026-12-31T09:00:00.000Z' },
      },
    }).as('getRecoveryInfo');
    cy.intercept({ method: 'POST', pathname: '/api/auth/account/deletion/recovery' }, (request) => {
      expect(request.body).to.deep.equal({ token: 'recovery-token' });
      request.reply({ statusCode: 200, body: { success: true } });
    }).as('recoverAccount');

    cy.visit('/account/deletion/recovery?token=recovery-token');
    cy.wait('@getRecoveryInfo');

    cy.contains('2026').should('be.visible');
    cy.get('[data-testid="account-recovery-submit"]')
      .should('be.enabled')
      .click();
    cy.wait('@recoverAccount');
    cy.get('[data-testid="account-recovery-header"]').should('contain.text', '계정 복구 완료');
    cy.get('[data-testid="account-recovery-login"]').should('be.visible');
  });

  it('6. renders a shared ranking prediction as read-only', () => {
    cy.intercept({ method: 'GET', pathname: '/api/predictions/ranking/share/share-123/2026' }, {
      statusCode: 200,
      body: {
        id: 1,
        shareId: 'share-123',
        seasonYear: 2026,
        teamIdsInOrder: ['lg', 'hanwha'],
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    }).as('getSharedPrediction');

    cy.visit('/predictions/ranking/share/share-123/2026');
    cy.wait('@getSharedPrediction');

    cy.contains('2026 KBO 시즌 순위 예측').should('be.visible');
    cy.get('[data-testid^="ranking-row-"]').should('have.length', 2);
    cy.get('[data-testid^="ranking-move-"]').should('not.exist');
    cy.contains('나도 예측하기').should('have.attr', 'href', '/prediction');
  });

  it('7. renders the authenticated cheer bookmarks empty state', () => {
    cy.mockAPI();
    cy.intercept('GET', '**/api/cheer/bookmarks*', {
      statusCode: 200,
      body: pageResponse([]),
    }).as('getBookmarks');

    cy.login('user');
    cy.visit('/cheer/bookmarks');
    cy.wait('@getBookmarks');

    cy.get('h1').should('contain.text', '북마크');
    cy.contains('아직 북마크한 게시글이 없습니다').should('be.visible');
    cy.contains('응원 게시판으로 이동').click();
    cy.location('pathname').should('eq', '/cheer');
  });

  it('8. loads an owned cheer post in the edit page', () => {
    cy.mockAPI();
    cy.intercept('GET', '**/api/cheer/posts/42', {
      statusCode: 200,
      body: {
        id: 42,
        teamId: 'HH',
        team: 'HH',
        content: '수정 대상 응원글',
        author: 'TestUser',
        authorId: 123,
        authorHandle: 'testuser',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        postType: 'NORMAL',
        isOwner: true,
        imageUrls: [],
      },
    }).as('getOwnedCheerPost');
    cy.intercept('GET', '**/api/cheer/posts/42/images', {
      statusCode: 200,
      body: [],
    }).as('getCheerPostImages');

    cy.login('user');
    cy.visit('/cheer/edit/42');
    cy.wait('@getOwnedCheerPost');
    cy.wait('@getCheerPostImages');

    cy.get('h2').should('contain.text', '응원글 수정');
    cy.get('textarea').should('have.value', '수정 대상 응원글');
    cy.contains('button', '수정 완료').should('be.enabled');
  });

  it('9. renders the not-found fallback and returns home', () => {
    cy.visit('/page-that-does-not-exist');

    cy.get('h1').should('contain.text', '페이지를 찾을 수 없습니다');
    cy.contains('button', '홈으로 이동').click();
    cy.location('pathname').should('eq', '/home');
  });
});
