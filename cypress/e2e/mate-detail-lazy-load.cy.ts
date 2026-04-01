/// <reference types="cypress" />

describe('MateDetail auxiliary panel lazy load', () => {
  const fakeToken = 'mate-detail-lazy-token';
  const testUser = {
    id: 1,
    email: 'test@example.com',
    name: 'TestUser',
    handle: '@testuser',
    role: 'ROLE_USER',
    favoriteTeam: 'SS',
    hasPassword: true,
    profileImageUrl: null,
  };

  const detailParty = {
    id: 982,
    hostId: 999,
    hostName: '지연 로드 호스트',
    hostBadge: 'VERIFIED',
    hostAverageRating: 4.8,
    hostReviewCount: 15,
    hostProfileImageUrl: 'https://cdn.example.com/profile.png',
    hostFavoriteTeam: 'SS',
    hostHandle: '@lazy-host',
    status: 'MATCHED',
    gameDate: '2026-03-28',
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
    description: 'lazy auxiliary panel 검증용 파티',
    createdAt: '2026-03-01T09:00:00',
  };

  const approvedApplication = {
    id: 77,
    partyId: detailParty.id,
    applicantId: 1,
    applicantName: 'TestUser',
    applicantBadge: 'NEW',
    applicantRating: 4.4,
    message: '참여 승인됨',
    depositAmount: 26000,
    paymentType: 'DEPOSIT',
    isApproved: true,
    isRejected: false,
    createdAt: '2026-03-10T10:00:00Z',
  };

  const seedAuthState = (win: Window) => {
    const authState = {
      state: {
        user: testUser,
        isLoggedIn: true,
        isAdmin: false,
      },
      version: 0,
    };

    win.localStorage.setItem('auth-storage', JSON.stringify(authState));
    win.localStorage.setItem('accessToken', fakeToken);
    win.localStorage.setItem('bega_has_visited', 'true');
    win.localStorage.setItem('bega_dont_show_guide', 'true');
    win.document.cookie = `Authorization=${fakeToken}; path=/`;
  };

  const getAuxChunkResourceCounts = (win: Window) => {
    const resourceEntries = win.performance.getEntriesByType('resource');
    const countChunkLoads = (chunkName: string) => (
      resourceEntries.filter((entry) => entry.name.includes(chunkName)).length
    );

    return {
      qrPanel: countChunkLoads('/MateDetailQrPanel.tsx') + countChunkLoads('MateDetailQrPanel-'),
      seatPanel: countChunkLoads('/MateDetailSeatPanel.tsx') + countChunkLoads('MateDetailSeatPanel-'),
      qrVendor: countChunkLoads('react-qr-code') + countChunkLoads('vendor-qr-'),
      seatGallery: countChunkLoads('/SeatViewGallery.tsx') + countChunkLoads('SeatViewGallery-'),
    };
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
    cy.viewport(1280, 800);

    cy.intercept('GET', `**/api/parties/${detailParty.id}*`, {
      statusCode: 200,
      body: detailParty,
    }).as('getPartyById');
    cy.intercept('GET', `**/api/applications/party/${detailParty.id}/mine`, {
      statusCode: 200,
      body: approvedApplication,
    }).as('getMyApplicationByParty');
    cy.intercept('GET', `**/api/applications/party/${detailParty.id}*`, {
      statusCode: 200,
      body: [],
    }).as('getPartyApplications');
    cy.intercept('GET', '**/api/diary/seat-views*', {
      statusCode: 200,
      body: [],
    }).as('getSeatViews');
    cy.intercept('POST', '**/api/checkin/qr-session', {
      statusCode: 201,
      body: {
        sessionId: `session-${detailParty.id}`,
        partyId: detailParty.id,
        expiresAt: '2026-03-28T08:00:00Z',
        checkinUrl: `http://127.0.0.1:5176/mate/${detailParty.id}/checkin?sessionId=session-${detailParty.id}`,
      },
    }).as('createCheckinQrSession');
  });

  it('defers QR and seat auxiliary chunks until the user opens each panel', () => {
    cy.visit(`/mate/${detailParty.id}`, {
      onBeforeLoad(win) {
        seedAuthState(win);
      },
    });

    cy.wait('@getPartyById');
    cy.wait('@getMyApplicationByParty');
    cy.contains('lazy auxiliary panel 검증용 파티').should('be.visible');
    cy.get('@createCheckinQrSession.all').should('have.length', 0);
    cy.get('@getSeatViews.all').should('have.length', 0);

    cy.window().then((win) => {
      const chunkCounts = getAuxChunkResourceCounts(win);
      expect(chunkCounts.qrPanel).to.eq(0);
      expect(chunkCounts.seatPanel).to.eq(0);
      expect(chunkCounts.qrVendor).to.eq(0);
      expect(chunkCounts.seatGallery).to.eq(0);
    });

    cy.get('[data-testid="mate-open-qr-panel"]').click();
    cy.wait('@createCheckinQrSession');
    cy.get('[data-testid="mate-qr-panel"]').should('be.visible');
    cy.contains('닫기').click();

    cy.get('[data-testid="mate-open-seat-panel"]').click();
    cy.wait('@getSeatViews');
    cy.get('[data-testid="mate-seat-panel"]').should('be.visible');
  });
});
