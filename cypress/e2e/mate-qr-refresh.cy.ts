/// <reference types="cypress" />

describe('MateDetail QR refresh', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  it('avoids immediate recursive refresh and retries after minimum 10 seconds for expired session', () => {
    const nowMs = Date.parse('2026-03-01T12:00:00Z');
    cy.clock(nowMs);

    const detailParty = {
      id: 777,
      hostId: 123,
      hostName: '상세호스트',
      hostBadge: 'NEW',
      hostRating: 4.5,
      hostProfileImageUrl: 'https://cdn.example.com/profile.png',
      hostFavoriteTeam: 'KT',
      status: 'PENDING',
      gameDate: '2026-03-02',
      gameTime: '19:00',
      stadium: '문학 카펜트리',
      teamId: 'KT',
      homeTeam: 'KT',
      awayTeam: 'LG',
      section: '1루석',
      maxParticipants: 4,
      currentParticipants: 1,
      ticketVerified: true,
      ticketPrice: 50000,
      description: 'QR 자동 갱신 검증용 파티',
      createdAt: '2026-02-20T09:00:00',
    };

    let qrSessionCallCount = 0;
    let baselineCallCount = 0;

    cy.intercept('GET', '**/api/parties*', {
      statusCode: 200,
      body: {
        content: [detailParty],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 9,
      },
    }).as('getParties');
    cy.intercept('GET', '**/api/parties/777*', {
      statusCode: 200,
      body: detailParty,
    }).as('getPartyById');
    cy.intercept('GET', '**/api/applications/party/777/mine', {
      statusCode: 200,
      body: null,
    }).as('getMyApplicationByParty');
    cy.intercept('GET', '**/api/applications/party/777*', {
      statusCode: 200,
      body: [],
    }).as('getPartyApplications');
    cy.intercept('GET', '**/api/reviews/user/123/average', {
      statusCode: 200,
      body: 4.3,
    }).as('getHostRating');
    cy.intercept('POST', '**/api/checkin/qr-session', (req) => {
      qrSessionCallCount += 1;
      req.reply({
        statusCode: 201,
        body: {
          sessionId: `session-${qrSessionCallCount}`,
          partyId: 777,
          expiresAt: '2026-03-01T11:59:00Z',
          checkinUrl: `http://localhost:5176/mate/777/checkin?sessionId=session-${qrSessionCallCount}`,
        },
      });
    }).as('createCheckinQrSession');

    cy.visit('/mate');
    cy.wait('@getParties');
    cy.contains('문학 카펜트리').click();
    cy.url().should('include', '/mate/777');
    cy.wait('@getPartyById');
    cy.wait('@createCheckinQrSession');
    cy.contains('문학 카펜트리').should('be.visible');

    cy.then(() => {
      baselineCallCount = qrSessionCallCount;
      expect(baselineCallCount).to.be.greaterThan(0);
    });

    cy.tick(0);
    cy.then(() => {
      expect(qrSessionCallCount).to.eq(baselineCallCount);
    });

    cy.tick(9_999);
    cy.then(() => {
      expect(qrSessionCallCount).to.eq(baselineCallCount);
    });

    cy.tick(1);
    cy.wrap(null).should(() => {
      expect(qrSessionCallCount).to.eq(baselineCallCount + 1);
    });

    cy.tick(0);
    cy.then(() => {
      expect(qrSessionCallCount).to.eq(baselineCallCount + 1);
    });
  });
});
