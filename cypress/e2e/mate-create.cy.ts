/// <reference types="cypress" />

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

describe('Mate Create Flow', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();

    cy.intercept('**/api/users/123/social-verified', {
      statusCode: 200,
      body: { success: true, data: true },
    }).as('socialVerified');
  });

  it('requires ticket upload and supports OCR retry flow', () => {
    let analyzeAttempt = 0;
    cy.intercept('POST', '**/api/tickets/analyze', (req) => {
      analyzeAttempt += 1;
      if (analyzeAttempt === 1) {
        req.reply({
          statusCode: 500,
          body: { message: 'ocr_failed' },
        });
        return;
      }

      req.reply({
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
      });
    }).as('analyzeTicket');

    cy.intercept('GET', '**/api/kbo/schedule*', (req) => {
      req.reply([
        {
          gameId: 'manual-1',
          time: '18:30',
          stadium: '잠실야구장',
          homeTeam: 'LG',
          awayTeam: 'KT',
        },
      ]);
    }).as('manualSchedule');

    cy.visit('/mate/create');
    cy.contains('직관메이트 파티 만들기').should('be.visible');
    cy.contains('button', '다음').should('be.disabled');
    cy.contains('직접 입력하기').should('not.exist');

    uploadTicketImage();
    cy.wait('@analyzeTicket');
    cy.contains('파일 업로드 완료, AI 분석 실패').should('be.visible');
    cy.contains('OCR이 실패하면 같은 파일 또는 다른 파일로 다시 시도해주세요.').should('be.visible');

    cy.contains('button', '다시 시도').click();
    cy.wait('@analyzeTicket');
    cy.contains('경기 선택').should('be.visible');

    cy.get('#gameDate').clear().type('2026-05-20');
    cy.get('#gameDate').should('have.value', '2026-05-20');

    cy.contains('잠실야구장').should('be.visible').click();
    cy.contains('button', '다음').should('not.be.disabled');
  });

  it('allows manual match input when schedule API returns empty', () => {
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
    }).as('analyzeTicketSuccess');

    cy.intercept('GET', '**/api/kbo/schedule*', {
      statusCode: 200,
      body: [],
    }).as('emptySchedule');

    cy.visit('/mate/create');
    cy.contains('직관메이트 파티 만들기').should('be.visible');

    uploadTicketImage();
    cy.wait('@analyzeTicketSuccess');
    cy.contains('경기 선택').should('be.visible');

    cy.get('#gameDate').clear().type('2026-05-20');
    cy.wait('@emptySchedule');

    cy.contains('경기 목록 조회 결과가 없습니다. 수동 입력으로 계속 진행할 수 있습니다.').should('be.visible');
    cy.get('#manualGameTime').clear().type('18:30');
    cy.get('#manualStadium').clear().type('잠실야구장');

    cy.contains('label', '원정 팀')
      .parent()
      .within(() => {
        cy.get('button[role="combobox"]').click();
      });
    cy.contains('[role="option"]', 'KT 위즈').click();

    cy.contains('label', '홈 팀')
      .parent()
      .within(() => {
        cy.get('button[role="combobox"]').click();
      });
    cy.contains('[role="option"]', 'LG 트윈스').click();

    cy.contains('button', '다음').should('not.be.disabled');
  });

  it('handles submit modal cancel/confirm, 403 and 500 errors, then success redirect', () => {
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
    }).as('analyzeTicketSuccess');

    cy.intercept('GET', '**/api/kbo/schedule*', (req) => {
      req.reply([
        {
          gameId: 'match-1',
          time: '18:30',
          stadium: '잠실야구장',
          homeTeam: 'LG',
          awayTeam: 'KT',
        },
      ]);
    }).as('schedule');

    let createPartyCallCount = 0;
    cy.intercept('POST', '**/api/parties', (req) => {
      createPartyCallCount += 1;

      if (createPartyCallCount === 1) {
        req.reply({ statusCode: 403, body: { message: 'verification_required' } });
        return;
      }

      if (createPartyCallCount === 2) {
        req.reply({ statusCode: 500, body: { message: '서버 오류입니다.' } });
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          id: 999,
          hostId: 123,
          hostName: 'TestUser',
          hostBadge: 'NEW',
          hostAverageRating: null,
          hostReviewCount: 0,
          teamId: 'lg',
          gameDate: '2026-05-21',
          gameTime: '18:30',
          stadium: '잠실야구장',
          homeTeam: 'lg',
          awayTeam: 'kt',
          section: '[홈응원] 일반/시야 305블록 12열',
          maxParticipants: 2,
          currentParticipants: 1,
          description: '함께 안전하게 관람해요!',
          ticketVerified: true,
          ticketPrice: 22000,
          status: 'PENDING',
          createdAt: '2026-05-01T09:00:00',
        },
      });
    }).as('createParty');

    cy.intercept('GET', '**/api/applications/party/*/mine', {
      statusCode: 200,
      body: null,
    }).as('getMyApplicationByParty');

    cy.visit('/mate/create');
    cy.contains('직관메이트 파티 만들기').should('be.visible');

    uploadTicketImage();
    cy.wait('@analyzeTicketSuccess');
    cy.contains('경기 선택').should('be.visible');

    cy.get('#gameDate').should('have.value', '2026-05-20');
    cy.contains('잠실야구장').click();
    cy.contains('button', '다음').click();

    cy.contains('좌석 정보').should('be.visible');
    cy.get('input[placeholder="예: 305"]').clear().type('305');
    cy.get('input[placeholder="예: 12"]').clear().type('12');
    cy.get('#ticketPrice').clear().type('22000');
    cy.contains('button', '다음').click();

    cy.contains('파티 소개').should('be.visible');
    cy.get('#description').clear().type('함께 안전하고 즐겁게 직관하실 분을 찾습니다.');

    cy.contains('button', '파티 만들기').click();
    cy.contains('파티 생성 확인').should('be.visible');
    cy.contains('button', '수정하기').click();
    cy.contains('파티 생성 확인').should('not.exist');

    cy.contains('button', '파티 만들기').click();
    cy.contains('button', '확인').click();
    cy.wait('@createParty');
    cy.contains('본인인증 필요').should('be.visible');
    cy.contains('button', '나중에 하기').click();

    cy.contains('button', '파티 만들기').click();
    cy.contains('button', '확인').click();
    cy.wait('@createParty');
    cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');

    cy.contains('button', '파티 만들기').click();
    cy.contains('button', '확인').click();
    cy.wait('@createParty');
    cy.url().should('include', '/mate/999');
    cy.contains('잠실야구장').should('be.visible');
  });
});
