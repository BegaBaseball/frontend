/// <reference types="cypress" />

// Desktop(xl+) master-detail: clicking a list card opens the party detail in a
// right slide-over drawer (URL `/mate?party=:id`) while the list stays mounted.
// Below xl the same click navigates to the full-page `/mate/:id` route.
describe('Mate desktop detail drawer', () => {
  const drawerSelector = '[data-testid="mate-detail-drawer"]';
  const party = {
    id: 777,
    hostId: 999,
    hostName: '드로어 호스트',
    status: 'PENDING',
    gameDate: '2026-05-01',
    gameTime: '18:30',
    stadium: '잠실야구장',
    teamId: 'LG',
    homeTeam: 'LG',
    awayTeam: 'KT',
    section: '1루석',
    maxParticipants: 4,
    currentParticipants: 1,
    description: '드로어 검증용 파티',
    hostProfileImageUrl: null,
    hostFavoriteTeam: 'LG',
    hostBadge: 'NEW',
    hostAverageRating: 4.5,
    hostReviewCount: 3,
    ticketVerified: true,
    ticketPrice: 50000,
    createdAt: '2026-04-01T00:00:00',
  };

  const listBody = {
    content: [party],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 9,
  };

  const rejectedApplication = {
    id: 901,
    partyId: party.id,
    applicantHandle: '@testuser',
    applicantName: 'TestUser',
    applicantBadge: 'NEW',
    applicantRating: 4.2,
    message: '다른 파티 보기 버튼 검증용 신청입니다.',
    isApproved: false,
    isRejected: true,
    createdAt: '2026-04-02T00:00:00',
  };

  const openFirstPartyCard = () => {
    cy.get('button[aria-label*="파티 상세 보기"]').first().click();
  };

  beforeEach(() => {
    cy.login('user');

    cy.intercept('GET', '**/api/parties*', (req) => {
      const url = new URL(req.url);
      if (!url.pathname.endsWith('/parties') && !url.pathname.endsWith('/parties/')) {
        return; // defer to the /parties/:id intercept below
      }
      req.reply({ statusCode: 200, body: listBody });
    }).as('getParties');

    cy.intercept('GET', '**/api/parties/777*', { statusCode: 200, body: party }).as('getParty777');
    cy.intercept('GET', '**/api/applications/party/777/mine', { statusCode: 200, body: null }).as('getMyApplication');
    cy.intercept('GET', '**/api/applications/party/777*', { statusCode: 200, body: [] }).as('getApplications');
  });

  it('opens the detail drawer on card click at xl and keeps the list mounted', () => {
    cy.viewport(1280, 900);
    cy.visit('/mate?source=drawer');
    cy.wait('@getParties');
    cy.contains('직관 메이트 찾기').should('be.visible');

    openFirstPartyCard();

    // URL syncs via search param (no full-page route change)
    cy.location('pathname').should('eq', '/mate');
    cy.location('search').should('contain', 'party=777');
    cy.location('search').should('contain', 'source=drawer');

    // Drawer renders the detail; list header is still present behind it
    cy.get(drawerSelector).should('be.visible').within(() => {
      cy.contains('잠실야구장').should('be.visible');
      cy.contains('button', '닫기').should('be.visible');
    });
    cy.contains('직관 메이트 찾기').should('exist');

    // Close via the panel button → param cleared, drawer gone
    cy.get(drawerSelector).contains('button', '닫기').click();
    cy.get(drawerSelector).should('not.exist');
    cy.location('search').should('not.contain', 'party=');
    cy.location('search').should('eq', '?source=drawer');
    cy.location('pathname').should('eq', '/mate');
  });

  it('uses replace semantics when closing so Back does not reopen the dismissed drawer', () => {
    cy.viewport(1280, 900);
    cy.visit('/mate?source=history');
    cy.wait('@getParties');

    openFirstPartyCard();
    cy.get(drawerSelector).should('be.visible');
    cy.location('search').should('contain', 'party=777');

    cy.get(drawerSelector).contains('button', '닫기').click();
    cy.get(drawerSelector).should('not.exist');
    cy.location('search').should('eq', '?source=history');

    cy.go('back');
    cy.location('pathname').should('eq', '/mate');
    cy.location('search').should('eq', '?source=history');
    cy.get(drawerSelector).should('not.exist');
  });

  it('opens the detail drawer from a direct xl query-param URL', () => {
    cy.viewport(1280, 900);
    cy.visit('/mate?source=direct&party=777');
    cy.wait('@getParties');
    cy.wait('@getParty777');

    cy.location('pathname').should('eq', '/mate');
    cy.location('search').should('contain', 'party=777');
    cy.location('search').should('contain', 'source=direct');
    cy.get(drawerSelector).should('be.visible').within(() => {
      cy.contains('잠실야구장').should('be.visible');
    });
  });

  it('cleans an invalid party query without rendering the drawer', () => {
    cy.viewport(1280, 900);
    cy.visit('/mate?party=not-a-party&source=invalid');
    cy.wait('@getParties');

    cy.get(drawerSelector).should('not.exist');
    cy.location('pathname').should('eq', '/mate');
    cy.location('search').should('eq', '?source=invalid');
  });

  it('closes the drawer with the Escape key', () => {
    cy.viewport(1280, 900);
    cy.visit('/mate?source=escape');
    cy.wait('@getParties');

    openFirstPartyCard();
    cy.get(drawerSelector).should('be.visible');

    cy.get('body').type('{esc}');
    cy.get(drawerSelector).should('not.exist');
    cy.location('search').should('not.contain', 'party=');
    cy.location('search').should('eq', '?source=escape');
  });

  it('closes the drawer through the rejected-application other-party action', () => {
    cy.intercept('GET', '**/api/applications/party/777/mine', {
      statusCode: 200,
      body: rejectedApplication,
    }).as('getRejectedApplication');

    cy.viewport(1280, 900);
    cy.visit('/mate?source=rejected&party=777');
    cy.wait('@getParties');
    cy.wait('@getParty777');
    cy.wait('@getRejectedApplication');

    cy.get(drawerSelector).contains('button', '다른 파티 보기').click();
    cy.get(drawerSelector).should('not.exist');
    cy.location('pathname').should('eq', '/mate');
    cy.location('search').should('eq', '?source=rejected');
  });

  it('navigates to the full-page detail on card click below xl', () => {
    cy.viewport(768, 1024);
    cy.visit('/mate');
    cy.wait('@getParties');

    openFirstPartyCard();

    cy.location('pathname').should('eq', '/mate/777');
    cy.get(drawerSelector).should('not.exist');
  });

  it('converts a direct party query to the full-page detail below xl', () => {
    cy.viewport(768, 1024);
    cy.visit('/mate?party=777');
    cy.wait('@getParty777');

    cy.location('pathname').should('eq', '/mate/777');
    cy.location('search').should('eq', '');
    cy.get(drawerSelector).should('not.exist');
  });
});
