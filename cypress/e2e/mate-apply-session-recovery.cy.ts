/// <reference types="cypress" />

const uploadVerificationTicket = () => {
  cy.get('input#ticketVerifyFile').selectFile(
    {
      contents: Cypress.Buffer.from('fake-verified-ticket-image'),
      fileName: 'verified-ticket.png',
      mimeType: 'image/png',
      lastModified: Date.now(),
    },
    { force: true }
  );
};

describe('Mate Apply Session Recovery', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  it('redirects to login and restores message plus verification after submit-time session expiry', () => {
    const partyId = 668;

    cy.intercept('GET', `**/api/parties/${partyId}`, {
      statusCode: 200,
      body: {
        id: partyId,
        hostId: 1,
        hostName: 'HOST',
        hostBadge: 'NEW',
        hostAverageRating: 5,
        hostReviewCount: 3,
        teamId: 'LG',
        gameDate: '2026-03-07',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '내야',
        maxParticipants: 3,
        currentParticipants: 1,
        description: 'apply restore party',
        ticketVerified: false,
        status: 'PENDING',
        ticketPrice: 17000,
      },
    }).as('getRestoreApplyParty');

    cy.intercept('POST', '**/api/tickets/analyze', {
      statusCode: 200,
      body: {
        date: '2026-03-07',
        time: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '내야',
        row: '12',
        seat: '15',
        peopleCount: 1,
        price: 17000,
        reservationNumber: 'R-RESTORE',
        gameId: 2001,
        verificationToken: 'restored-verification-token',
      },
    }).as('analyzeApplyTicket');

    cy.intercept('**/auth/reissue*', {
      statusCode: 401,
      body: { success: false, message: 'Unauthorized' },
    }).as('reissueExpiredForApply');

    let applyAttempt = 0;
    cy.intercept('POST', '**/api/applications', (req) => {
      applyAttempt += 1;

      if (applyAttempt === 1) {
        req.reply({
          statusCode: 401,
          body: { message: 'Unauthorized' },
        });
        return;
      }

      expect(req.body.message).to.eq('세션 만료 후에도 이어질 신청 메시지입니다.');
      expect(req.body.verificationToken).to.eq('restored-verification-token');
      expect(req.body.ticketVerified).to.eq(true);

      req.reply({
        statusCode: 201,
        body: {
          id: 33,
          partyId,
          applicantId: 123,
          applicantName: 'USER',
          applicantBadge: 'NEW',
          applicantRating: 5,
          message: '세션 만료 후에도 이어질 신청 메시지입니다.',
          isPaid: false,
          isApproved: false,
          isRejected: false,
          createdAt: '2026-03-03T10:00:02Z',
        },
      });
    }).as('createRestoredApplication');

    cy.visit(`/mate/${partyId}/apply`);
    cy.wait('@getRestoreApplyParty');

    cy.get('textarea#message').type('세션 만료 후에도 이어질 신청 메시지입니다.');
    uploadVerificationTicket();
    cy.wait('@analyzeApplyTicket');
    cy.contains('인증 완료').should('be.visible');

    cy.contains('참여 신청하기').click();
    cy.wait('@createRestoredApplication');
    cy.wait('@reissueExpiredForApply');
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', `?redirect=%2Fmate%2F${partyId}%2Fapply`);
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(`mateApplyDraft:${partyId}`)).to.contain('세션 만료 후에도 이어질 신청 메시지입니다.');
    });

    cy.login('user');
    cy.visit(`/mate/${partyId}/apply`);
    cy.wait('@getRestoreApplyParty');

    cy.get('textarea#message').should('have.value', '세션 만료 후에도 이어질 신청 메시지입니다.');
    cy.contains('인증 완료').should('be.visible');
    cy.contains('참여 신청하기').click();
    cy.wait('@createRestoredApplication');
    cy.location('pathname').should('eq', `/mate/${partyId}`);
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem(`mateApplyDraft:${partyId}`)).to.eq(null);
    });
  });
});
