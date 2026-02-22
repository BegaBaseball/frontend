describe('Mate Flow Policy', () => {
  beforeEach(() => {
    cy.login('user');
    cy.mockAPI();
  });

  it('SELLING 파티는 결제 준비 API를 반드시 호출하고 직접 신청 생성을 우회하지 않는다', () => {
    let createApplicationCalled = false;

    cy.intercept('GET', '**/api/parties/777', {
      statusCode: 200,
      body: {
        id: 777,
        hostId: 1,
        hostName: 'SELLER',
        hostBadge: 'VERIFIED',
        hostRating: 5,
        teamId: 'LG',
        gameDate: '2026-03-01',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '1루',
        maxParticipants: 2,
        currentParticipants: 1,
        description: 'selling party',
        ticketVerified: true,
        status: 'SELLING',
        price: 50000,
        ticketPrice: 12000,
      },
    }).as('getSellingParty');

    cy.intercept('POST', '**/api/payments/toss/prepare', {
      statusCode: 200,
      body: {
        intentId: 1,
        orderId: 'MATE-777-11-1735123456789',
        amount: 50000,
        currency: 'KRW',
        orderName: 'KBO 메이트 티켓 구매 - 잠실',
        flowType: 'SELLING_FULL',
        paymentType: 'FULL',
      },
    }).as('preparePayment');

    cy.intercept('POST', '**/api/applications', (req) => {
      createApplicationCalled = true;
      req.reply({ statusCode: 201, body: {} });
    }).as('createApplication');

    cy.visit('/mate/777/apply');
    cy.wait('@getSellingParty');
    cy.contains('결제하기').click();
    cy.wait('@preparePayment');
    cy.wrap(null).then(() => {
      expect(createApplicationCalled).to.eq(false);
    });
  });

  it('승인 전에는 채팅 조회 접근이 차단된다', () => {
    cy.intercept('GET', '**/api/parties/888', {
      statusCode: 200,
      body: {
        id: 888,
        hostId: 1,
        hostName: 'HOST',
        hostBadge: 'NEW',
        hostRating: 5,
        teamId: 'LG',
        gameDate: '2026-03-02',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '3루',
        maxParticipants: 3,
        currentParticipants: 1,
        description: 'pending party',
        ticketVerified: false,
        status: 'PENDING',
      },
    }).as('getPendingParty');

    cy.intercept('GET', '**/api/applications/party/888/mine', {
      statusCode: 200,
      body: null,
    }).as('myPendingApplication');

    cy.intercept('GET', '**/api/chat/party/888', {
      statusCode: 403,
      body: { error: '파티 참여자만 채팅을 조회할 수 있습니다.' },
    }).as('chatDenied');

    cy.visit('/mate/888/chat');
    cy.wait('@getPendingParty');
    cy.wait('@myPendingApplication');
    cy.wait('@chatDenied')
      .its('response.statusCode')
      .should('eq', 403);
  });

  it('승인 후에는 채팅 조회 접근이 허용된다', () => {
    cy.intercept('GET', '**/api/parties/999', {
      statusCode: 200,
      body: {
        id: 999,
        hostId: 123,
        hostName: 'HOST',
        hostBadge: 'NEW',
        hostRating: 5,
        teamId: 'LG',
        gameDate: '2026-03-03',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '외야',
        maxParticipants: 2,
        currentParticipants: 2,
        description: 'matched party',
        ticketVerified: false,
        status: 'MATCHED',
      },
    }).as('getMatchedParty');

    cy.intercept('GET', '**/api/chat/party/999', {
      statusCode: 200,
      body: [
        {
          id: 1,
          partyId: 999,
          senderId: 1,
          senderName: 'HOST',
          message: '채팅 입장 가능합니다.',
          createdAt: '2026-03-03T09:00:00Z',
        },
      ],
    }).as('chatAllowed');

    cy.visit('/mate/999/chat');
    cy.wait('@getMatchedParty');
    cy.wait('@chatAllowed')
      .its('response.statusCode')
      .should('eq', 200);
  });
});
