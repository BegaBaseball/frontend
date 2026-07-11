/// <reference types="cypress" />

import {
  AUTH_BOOTSTRAP_META_KEY,
  CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY,
  seedCypressAuthState,
} from '../support/auth';

describe('Mate mobile smoke', () => {
  const fakeToken = 'mate-mobile-smoke-token';
  const testUser = {
    id: 1,
    email: 'test@example.com',
    name: 'TestUser',
    handle: 'testuser',
    role: 'ROLE_USER',
    favoriteTeam: 'HH',
    hasPassword: true,
    profileImageUrl: null,
  };

  const listParty = {
    id: 777,
    hostHandle: 'visualhost',
    hostName: '비주얼 호스트',
    hostBadge: 'VERIFIED',
    hostAverageRating: 4.7,
    hostReviewCount: 21,
    hostProfileImageUrl: null,
    hostFavoriteTeam: 'SS',
    status: 'PENDING',
    gameDate: '2026-03-22',
    gameTime: '18:30',
    stadium: '대구삼성라이온즈파크',
    teamId: 'SS',
    homeTeam: 'SS',
    awayTeam: 'LG',
    section: '블루존',
    maxParticipants: 4,
    currentParticipants: 2,
    ticketPrice: 26000,
    ticketVerified: true,
    description: '모바일 스모크 검증용 파티',
    createdAt: '2026-03-01T09:00:00',
  };

  const setupAuth = (theme: 'light' | 'dark' = 'light') => {
    cy.visit('/mate', {
      onBeforeLoad(win) {
        seedCypressAuthState(win, testUser, fakeToken, { theme });
      },
    });
    cy.window().then((win) => {
      seedCypressAuthState(win, testUser, fakeToken, { theme });
    });
  };

  const setupMocks = () => {
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: {
        success: true,
        data: testUser,
      },
    });

    cy.intercept('GET', '**/api/parties*', (req) => {
      const requestUrl = new URL(req.url);
      if (!requestUrl.pathname.endsWith('/parties') && !requestUrl.pathname.endsWith('/parties/')) {
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          content: [listParty],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 9,
        },
      });
    }).as('getMateParties');

    cy.intercept('GET', '**/api/parties/my*', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '**/api/parties/search-terms/popular*', {
      statusCode: 200,
      body: [
        { term: '잠실 블루존', count: 9, rank: 1 },
        { term: '삼성 테이블석', count: 5, rank: 2 },
        { term: '주말 직관', count: 4, rank: 3 },
      ],
    }).as('getMatePopularSearchTerms');

    cy.intercept('POST', '**/api/parties/search-terms', {
      statusCode: 204,
      body: null,
    }).as('recordMateSearchTerm');

    cy.intercept('GET', '**/api/parties/777*', {
      statusCode: 200,
      body: listParty,
    }).as('getMateDetailParty');

    cy.intercept('GET', '**/api/applications/party/777/mine', {
      statusCode: 200,
      body: null,
    });

    cy.intercept('GET', '**/api/applications/party/777*', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '**/api/chat/my/unread-counts', {
      statusCode: 200,
      body: { success: true, data: 0 },
    });

    cy.intercept('GET', '**/api/notifications/my/unread-count', {
      statusCode: 200,
      body: 0,
    });

    cy.intercept('GET', '**/api/notifications/my', {
      statusCode: 200,
      body: [],
    });
  };

  beforeEach(() => {
    cy.viewport(390, 844);
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
    cy.failOnUnexpectedApi401();
    setupMocks();
  });

  it('checks the mobile list date scroller and popular search bottom sheet flow', () => {
    setupAuth('light');
    cy.wait('@getMateParties');

    cy.contains('h1', '직관 메이트 찾기').should('be.visible');
    cy.get('button[aria-label^="전체 날짜 필터"]').should('be.visible');
    cy.contains('비주얼 호스트').should('be.visible');

    cy.contains('button', '필터').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('메이트 필터').should('be.visible');
      cy.contains('팀').should('be.visible');
      cy.contains('좌석').should('be.visible');
      cy.contains('인기 검색어').should('be.visible');
      cy.contains('button', '잠실 블루존').click();
    });

    cy.contains('메이트 필터').should('not.exist');
    cy.get('input[placeholder*="팀명"]').should('have.value', '잠실 블루존');
    cy.wait('@recordMateSearchTerm')
      .its('request.body')
      .should('deep.equal', { term: '잠실 블루존' });
    cy.get('@recordMateSearchTerm.all').should('have.length', 1);

    cy.contains('button', '필터').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('h2', '최근 검색어')
        .closest('section')
        .within(() => {
          cy.contains('button', '잠실 블루존').should('be.visible');
          cy.contains('button', '전체삭제').click();
          cy.contains('button', '잠실 블루존').should('not.exist');
        });
      cy.contains('h2', '인기 검색어')
        .closest('section')
        .within(() => {
          cy.contains('button', '잠실 블루존').click();
        });
    });
    cy.contains('메이트 필터').should('not.exist');
    cy.get('input[placeholder*="팀명"]').should('have.value', '잠실 블루존');
    cy.wait(1500);
    cy.get('@recordMateSearchTerm.all').should('have.length', 1);

    cy.contains('button', '필터').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('h2', '최근 검색어')
        .closest('section')
        .within(() => {
          cy.contains('button', '잠실 블루존').should('be.visible');
        });
      cy.contains('button', '적용').click();
    });
    cy.contains('메이트 필터').should('not.exist');
  });

  it('records a stable typed search term once per session', () => {
    setupAuth('light');
    cy.wait('@getMateParties');
    cy.scrollTo('top');
    cy.get('input[placeholder*="팀명"]').clear({ force: true }).type('  삼성   테이블석  ', { force: true });
    cy.wait(1500);
    cy.wait('@recordMateSearchTerm')
      .its('request.body')
      .should('deep.equal', { term: '삼성 테이블석' });

    cy.get('input[placeholder*="팀명"]').clear({ force: true }).type('삼성 테이블석', { force: true });
    cy.wait(1500);
    cy.get('@recordMateSearchTerm.all').should('have.length', 1);

    cy.get('input[placeholder*="팀명"]').clear({ force: true });
    cy.contains('button', '필터').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('최근 검색어').should('be.visible');
      cy.contains('button', '삼성 테이블석').click();
    });
    cy.contains('메이트 필터').should('not.exist');
    cy.get('input[placeholder*="팀명"]').should('have.value', '삼성 테이블석');
  });

  it('keeps guest visitors on the login entry without server recording', () => {
    cy.intercept('GET', '**/auth/mypage*', {
      statusCode: 200,
      body: { success: false, data: null },
    }).as('guestGetMe');

    cy.visit('/mate', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('auth-storage');
        win.localStorage.removeItem('accessToken');
        win.localStorage.removeItem('auth-bootstrap-hint');
        win.localStorage.removeItem(AUTH_BOOTSTRAP_META_KEY);
        win.sessionStorage.setItem(CYPRESS_SKIP_PUBLIC_AUTH_BOOTSTRAP_KEY, '1');
        win.document.cookie = 'Authorization=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      },
    });
    cy.get('[data-testid="mate-logged-out-entry"]').should('be.visible');
    cy.contains('로그인하고 직관 메이트를 찾아보세요').should('be.visible');
    cy.get('@recordMateSearchTerm.all').should('have.length', 0);
  });

  it('checks the mobile detail shell', () => {
    cy.visit('/mate/777', {
      onBeforeLoad(win) {
        seedCypressAuthState(win, testUser, fakeToken, { theme: 'dark' });
      },
    });
    cy.wait('@getMateDetailParty');

    cy.contains('블루존').should('be.visible');
    cy.get('button:visible').contains('메이트 신청하기').should('be.visible');
  });

  it('checks the mobile create shell', () => {
    cy.visit('/mate/create', {
      onBeforeLoad(win) {
        seedCypressAuthState(win, testUser, fakeToken, { theme: 'light' });
      },
    });

    cy.contains('직관메이트 파티 만들기').should('be.visible');
    cy.contains('티켓 인증').should('be.visible');
    cy.contains('티켓 사진으로 자동 입력').should('be.visible');
  });
});
