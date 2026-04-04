/// <reference types="cypress" />

export {};

const uploadTicketImage = () => {
  cy.get('input#ticketFile').selectFile(
    {
      contents: Cypress.Buffer.from('fake-ticket-image'),
      fileName: 'ticket.png',
      mimeType: 'image/png',
      lastModified: Date.now(),
    },
    { force: true }
  );
};

describe('Mate Create Session Recovery', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();

    cy.intercept('GET', '**/api/users/123/social-verified', {
      statusCode: 200,
      body: { success: true, data: true },
    }).as('socialVerified');
  });

  it('redirects to login and restores the draft after submit-time session expiry', () => {
    cy.intercept('POST', '**/api/tickets/analyze', {
      statusCode: 200,
      body: {
        date: '2026-05-20',
        time: '18:30:00',
        stadium: '잠실야구장',
        homeTeam: 'LG',
        awayTeam: 'KT',
        section: '1루석',
        row: '12',
        seat: '15',
        peopleCount: 2,
        price: 22000,
        reservationNumber: 'R-123456',
        gameId: 1001,
        verificationToken: 'verification-token',
      },
    }).as('analyzeTicketForRestore');

    cy.intercept('GET', '**/api/kbo/schedule*', {
      statusCode: 200,
      body: [
        {
          gameId: 'match-restore',
          time: '18:30',
          stadium: '잠실야구장',
          homeTeam: 'LG',
          awayTeam: 'KT',
        },
      ],
    }).as('scheduleForRestore');

    let reissueAttemptCount = 0;
    cy.intercept('**/auth/reissue*', (req) => {
      reissueAttemptCount += 1;
      req.reply({
        statusCode: 401,
        body: { success: false, message: 'Unauthorized' },
      });
    }).as('reissueExpiredForCreate');

    cy.intercept('POST', '**/api/parties', {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('createPartyUnauthorized');

    cy.visit('/mate/create');
    cy.contains('직관메이트 파티 만들기').should('be.visible');

    uploadTicketImage();
    cy.wait('@analyzeTicketForRestore');
    cy.contains('경기 선택').should('be.visible');

    cy.get('#gameDate').should('have.value', '2026-05-20');
    cy.wait('@scheduleForRestore');
    cy.contains('잠실야구장').click();
    cy.contains('button', '다음').click();

    cy.get('input[placeholder="예: 305"]').clear().type('305');
    cy.get('input[placeholder="예: 12"]').clear().type('12');
    cy.get('#ticketPrice').clear().type('22000');
    cy.contains('button', '다음').click();

    cy.get('#description').clear().type('세션 만료 후에도 이어서 작성할 소개글입니다.');
    cy.contains('button', '파티 만들기').click();
    cy.contains('button', '확인').click();

    cy.wait('@createPartyUnauthorized');
    cy.then(() => {
      expect(reissueAttemptCount).to.eq(0);
    });
    cy.location('pathname').should('eq', '/login');
    cy.location('search').should('eq', '?redirect=%2Fmate%2Fcreate');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('mate-storage')).to.contain('세션 만료 후에도 이어서 작성할 소개글입니다.');
    });

    cy.login('user');
    cy.visit('/mate/create');

    cy.contains('단계 4 / 4').should('be.visible');
    cy.get('#description').should('have.value', '세션 만료 후에도 이어서 작성할 소개글입니다.');
  });
});
