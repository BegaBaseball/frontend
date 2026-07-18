/// <reference types="cypress" />

import { DEFAULT_CYPRESS_AUTH_TOKEN, seedCypressAuthState } from '../support/auth';

describe('Mate list URL state', () => {
  const user = {
    id: 123,
    email: 'mate-url@example.com',
    name: 'Mate URL User',
    handle: '@mateurl',
    role: 'ROLE_USER',
    favoriteTeam: 'HH',
    profileImageUrl: null,
    hasPassword: true,
  };
  const party = {
    id: 810,
    hostId: 999,
    hostHandle: '@urlhost',
    hostName: 'URL 호스트',
    hostBadge: 'VERIFIED',
    hostAverageRating: 4.8,
    hostReviewCount: 8,
    teamId: 'HH',
    gameDate: '2026-07-18',
    gameTime: '18:30',
    stadium: '대전 한화생명볼파크',
    homeTeam: 'HH',
    awayTeam: 'LG',
    section: '응원석',
    maxParticipants: 4,
    currentParticipants: 2,
    description: 'URL 상태 테스트',
    ticketVerified: true,
    status: 'MATCHED',
    createdAt: '2026-07-01T09:00:00Z',
  };
  const visitWithAuth = (path: string) => cy.visit(path, {
    onBeforeLoad(win) {
      seedCypressAuthState(win, user, DEFAULT_CYPRESS_AUTH_TOKEN);
    },
  });
  const assertRequest = (
    interception: Cypress.Interception,
    expected: Record<string, string | null>,
  ) => {
    const params = new URL(interception.request.url).searchParams;
    Object.entries(expected).forEach(([key, value]) => {
      expect(params.get(key), key).to.eq(value);
    });
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
    cy.viewport(1440, 900);
    let lastAliasedListUrl: string | null = null;
    cy.intercept({ method: 'GET', pathname: '/api/parties' }, (req) => {
      const params = new URL(req.url).searchParams;
      if (params.get('size') === '9' && req.url !== lastAliasedListUrl) {
        req.alias = 'getUrlParties';
        lastAliasedListUrl = req.url;
      }
      const requestedPage = Number(params.get('page') ?? 0);
      req.reply({
        statusCode: 200,
        body: {
          content: [party],
          totalElements: 3,
          totalPages: 3,
          number: requestedPage,
          size: 9,
        },
      });
    });
    cy.intercept('GET', '**/api/parties/810*', { statusCode: 200, body: party }).as('getUrlParty');
    cy.intercept('GET', '**/api/applications/party/810/mine', { statusCode: 404, body: {} });
    cy.intercept('GET', '**/api/applications/party/810*', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/api/diary/seat-views*', { statusCode: 200, body: [] });
  });

  it('hydrates a complete deep link and maps it to the exact backend request', () => {
    visitWithAuth('/mate?q=%20%EC%9E%A0%EC%8B%A4%20%20%EB%B8%94%EB%A3%A8%EC%A1%B4%20&date=2026-07-18&tab=matched&team=mine&sort=dDay&page=2&campaign=summer');
    cy.wait('@getUrlParties').then((call) => assertRequest(call, {
      searchQuery: '잠실 블루존',
      date: '2026-07-18',
      status: 'MATCHED',
      teamId: 'HH',
      sortBy: 'gameDate',
      sortDir: 'asc',
      page: '1',
    }));
    cy.location('search').should('contain', 'campaign=summer');
    cy.get('#mate-search').should('have.value', '잠실 블루존');
    cy.contains('2 / 3').should('be.visible');
  });

  it('canonicalizes invalid known params once while preserving unknown and legacy params', () => {
    visitWithAuth('/mate?tab=closed&team=other&sort=oldest&date=2026-02-30&page=0&campaign=a&party=invalid');
    cy.location('search').should('eq', '?campaign=a');
    cy.get('@getUrlParties.all').should((calls) => {
      const effectiveUrls = new Set(calls.map((call) => call.request.url));
      expect(effectiveUrls.size).to.eq(1);
    });
  });

  it('atomically commits debounced search and resets the URL page before the request', () => {
    visitWithAuth('/mate?page=2&campaign=a');
    cy.wait('@getUrlParties');
    cy.get('#mate-search').clear().type('  응원석  ');
    cy.wait('@getUrlParties').then((call) => assertRequest(call, {
      searchQuery: '응원석',
      page: '0',
    }));
    cy.location('search').should('contain', 'q=%EC%9D%91%EC%9B%90%EC%84%9D');
    cy.location('search').should('not.contain', 'page=');
    cy.location('search').should('contain', 'campaign=a');
  });

  it('atomically resets page for status, date, and sort control changes', () => {
    visitWithAuth('/mate?page=2');
    cy.wait('@getUrlParties');
    cy.contains('button', '매칭 완료').click();
    cy.wait('@getUrlParties').then((call) => assertRequest(call, {
      status: 'MATCHED',
      page: '0',
    }));
    cy.location('search').should('eq', '?tab=matched');

    visitWithAuth('/mate?page=2');
    cy.wait('@getUrlParties');
    cy.get('button[aria-label*="날짜 필터"]:visible').not('[aria-label^="전체 날짜"]').first().click();
    cy.wait('@getUrlParties').then((call) => {
      const params = new URL(call.request.url).searchParams;
      expect(params.get('date')).to.match(/^\d{4}-\d{2}-\d{2}$/);
      expect(params.get('page')).to.eq('0');
    });
    cy.location('search').should('match', /^\?date=\d{4}-\d{2}-\d{2}$/);

    visitWithAuth('/mate?page=2');
    cy.wait('@getUrlParties');
    cy.contains('button', '정렬: 최신순').click();
    cy.contains('[role="menuitemradio"]', '경기 임박순').click();
    cy.wait('@getUrlParties').then((call) => assertRequest(call, {
      sortBy: 'gameDate',
      sortDir: 'asc',
      page: '0',
    }));
    cy.location('search').should('eq', '?sort=dDay');
  });

  it('restores the canonical list through browser Back and the detail 목록으로 action', () => {
    const listPath = '/mate?q=%EC%9D%91%EC%9B%90%EC%84%9D&tab=matched&sort=popular&page=2';
    visitWithAuth(listPath);
    cy.wait('@getUrlParties');
    cy.get('button[aria-label*="파티 상세 보기"]').first().click();
    cy.location('pathname').should('eq', '/mate/810');
    cy.contains('button', '목록으로').first().click();
    cy.location('pathname').should('eq', '/mate');
    cy.location('search').should('eq', '?q=%EC%9D%91%EC%9B%90%EC%84%9D&tab=matched&sort=popular&page=2');

    cy.get('button[aria-label*="파티 상세 보기"]').first().click();
    cy.go('back');
    cy.location('pathname').should('eq', '/mate');
    cy.location('search').should('eq', '?q=%EC%9D%91%EC%9B%90%EC%84%9D&tab=matched&sort=popular&page=2');
  });

  it('clamps a syntactically valid out-of-range page after the successful response', () => {
    let lastAliasedListUrl: string | null = null;
    cy.intercept({ method: 'GET', pathname: '/api/parties' }, (req) => {
      const params = new URL(req.url).searchParams;
      const page = Number(params.get('page') ?? 0);
      if (params.get('size') === '9' && req.url !== lastAliasedListUrl) {
        req.alias = 'getClampedParties';
        lastAliasedListUrl = req.url;
      }
      req.reply({
        statusCode: 200,
        body: { content: [party], totalElements: 3, totalPages: 3, number: page, size: 9 },
      });
    });
    visitWithAuth('/mate?page=99');
    cy.wait('@getClampedParties').then((call) => assertRequest(call, { page: '98' }));
    cy.wait('@getClampedParties').then((call) => assertRequest(call, { page: '2' }));
    cy.location('search').should('eq', '?page=3');
  });

  it('does not let a delayed obsolete search response replace the latest result', () => {
    const slowParty = { ...party, id: 811, stadium: '느린 응답 구장' };
    const fastParty = { ...party, id: 812, stadium: '최신 응답 구장' };
    let slowRequestCount = 0;
    cy.intercept({ method: 'GET', pathname: '/api/parties' }, (req) => {
      const params = new URL(req.url).searchParams;
      const isMateListRequest = params.get('size') === '9';
      const searchQuery = params.get('searchQuery');
      if (isMateListRequest && searchQuery === '느림') {
        req.alias = 'getSlowSearchParties';
        slowRequestCount += 1;
        req.reply({
          delay: 900,
          body: { content: [slowParty], totalElements: 1, totalPages: 1, number: 0, size: 9 },
        });
        return;
      }
      if (isMateListRequest && searchQuery === '빠름') {
        req.alias = 'getFastSearchParties';
      }
      req.reply({
        body: {
          content: searchQuery === '빠름' ? [fastParty] : [party],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 9,
        },
      });
    });

    visitWithAuth('/mate');
    cy.get('#mate-search').type('느림');
    cy.wrap(null).should(() => {
      expect(slowRequestCount).to.be.greaterThan(0);
    });
    cy.get('#mate-search').clear().type('빠름');
    cy.wait('@getFastSearchParties');
    cy.contains('최신 응답 구장').should('be.visible');
    cy.wait('@getSlowSearchParties');
    cy.contains('최신 응답 구장').should('be.visible');
    cy.contains('느린 응답 구장').should('not.exist');
  });

  it('names the mobile filter dialog close control and restores focus after Escape', () => {
    cy.viewport(390, 844);
    visitWithAuth('/mate');
    cy.wait('@getUrlParties');
    cy.contains('button', '필터').as('filterTrigger').focus().click();
    cy.get('[role="dialog"][aria-labelledby]').should('be.visible').within(() => {
      cy.focused().should('have.attr', 'aria-label', '닫기');
    });
    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');
    cy.get('@filterTrigger').should('have.focus');
  });

  it('maps mobile team and seat controls to the same URL and API parameters as desktop', () => {
    cy.viewport(390, 844);
    visitWithAuth('/mate?page=2');
    cy.wait('@getUrlParties');
    cy.contains('button', '필터').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('button', '내 팀 경기만').click();
      cy.contains('button', '응원석').click();
      cy.contains('button', '적용').click();
    });
    cy.wait('@getUrlParties').then((call) => assertRequest(call, {
      teamId: 'HH',
      searchQuery: '응원석',
      page: '0',
    }));
    cy.location('search').should('contain', 'team=mine');
    cy.location('search').should('contain', 'q=%EC%9D%91%EC%9B%90%EC%84%9D');
    cy.location('search').should('not.contain', 'page=');
  });
});
